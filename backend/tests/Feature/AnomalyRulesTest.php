<?php

namespace Tests\Feature;

use App\Models\AllowanceType;
use App\Models\LeaveRequest;
use App\Models\Loan;
use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Models\SalaryGrade;
use App\Models\Staff;
use App\Models\StaffAllowance;
use App\Models\StaffAttendance;
use App\Services\Anomaly\Rules\BankDetailsMissing;
use App\Services\Anomaly\Rules\DuplicatePeriodPayment;
use App\Services\Anomaly\Rules\GhostInactiveStaff;
use App\Services\Anomaly\Rules\GhostNoUserAccount;
use App\Services\Anomaly\Rules\LoanOverDeduction;
use App\Services\Anomaly\Rules\PaymentWithoutAttendance;
use App\Services\Anomaly\Rules\SsnitMismatch;
use App\Services\Anomaly\Rules\UnauthorizedAllowance;
use App\Services\Anomaly\Rules\UnusuallyHighSalary;
use App\Services\PayrollCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnomalyRulesTest extends TestCase
{
    use RefreshDatabase;

    protected function makePayroll(array $staffAttrs = [], array $payrollAttrs = [], array $runAttrs = []): array
    {
        $this->seedRoles();
        $grade = SalaryGrade::query()->firstOrCreate(
            ['code' => 'T1'],
            [
                'name' => 'Teacher 1',
                'basic_salary' => 2500,
                'max_allowance_total' => 800,
            ]
        );

        $staff = Staff::query()->create(array_merge([
            'employee_id' => 'EMP-'.fake()->unique()->numerify('####'),
            'salary' => 2500,
            'salary_grade_id' => $grade->id,
            'status' => 'active',
            'bank_name' => 'GCB Bank',
            'bank_account' => '1234567890',
        ], $staffAttrs));

        $run = PayrollRun::query()->create(array_merge([
            'run_name' => 'Test Run',
            'pay_period_start' => '2026-07-01',
            'pay_period_end' => '2026-07-31',
            'payment_date' => '2026-07-28',
            'status' => 'draft',
        ], $runAttrs));

        $payroll = Payroll::query()->create(array_merge([
            'payroll_run_id' => $run->id,
            'staff_id' => $staff->id,
            'payment_date' => '2026-07-28',
            'basic_salary' => $staff->salary,
            'allowances' => 0,
            'gross_salary' => $staff->salary,
            'taxable_income' => 2362.5,
            'income_tax' => 300,
            'ssnit_contribution' => 137.5,
            'employer_ssnit' => 325,
            'loan_deductions' => 0,
            'absence_penalties' => 0,
            'deductions' => 437.5,
            'net_salary' => 2062.5,
            'status' => 'generated',
        ], $payrollAttrs));

        $payroll->setRelation('staff', $staff->load(['salaryGrade', 'allowances.allowanceType', 'loans', 'user']));

        return [$staff->fresh(), $run->fresh(), $payroll->fresh(['staff.salaryGrade', 'staff.allowances.allowanceType', 'staff.loans', 'staff.user'])];
    }

    public function test_ghost_no_user_account_triggers_and_clears(): void
    {
        [$staff, $run, $payroll] = $this->makePayroll(['user_id' => null]);
        $this->assertNotNull((new GhostNoUserAccount)->detect($payroll, $run));

        $user = $this->userWithRole('teacher');
        $staff->update(['user_id' => $user->id]);
        $payroll->setRelation('staff', $staff->fresh('user'));
        $this->assertNull((new GhostNoUserAccount)->detect($payroll, $run));
    }

    public function test_ghost_inactive_staff_triggers_and_clears(): void
    {
        [$staff, $run, $payroll] = $this->makePayroll(['status' => 'inactive']);
        $this->assertNotNull((new GhostInactiveStaff)->detect($payroll, $run));

        $staff->update(['status' => 'active']);
        $payroll->setRelation('staff', $staff->fresh());
        $this->assertNull((new GhostInactiveStaff)->detect($payroll, $run));
    }

    public function test_payment_without_attendance_triggers_without_leave(): void
    {
        [, $run, $payroll] = $this->makePayroll();
        $this->assertNotNull((new PaymentWithoutAttendance)->detect($payroll, $run));
    }

    public function test_approved_leave_suppresses_payment_without_attendance(): void
    {
        [$staff, $run, $payroll] = $this->makePayroll();
        LeaveRequest::query()->create([
            'staff_id' => $staff->id,
            'leave_type' => 'annual',
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-31',
            'days_requested' => 31,
            'status' => 'approved',
            'payroll_notified' => true,
        ]);

        $this->assertNull((new PaymentWithoutAttendance)->detect($payroll, $run));
    }

    public function test_present_attendance_clears_payment_without_attendance(): void
    {
        [$staff, $run, $payroll] = $this->makePayroll();
        StaffAttendance::query()->create([
            'staff_id' => $staff->id,
            'date' => '2026-07-10',
            'status' => 'present',
            'hours_worked' => 7,
        ]);

        $this->assertNull((new PaymentWithoutAttendance)->detect($payroll, $run));
    }

    public function test_duplicate_period_payment_triggers_and_clears(): void
    {
        [$staff, $run, $payroll] = $this->makePayroll();
        $this->assertNull((new DuplicatePeriodPayment)->detect($payroll, $run));

        Payroll::query()->create([
            'payroll_run_id' => $run->id,
            'staff_id' => $staff->id,
            'payment_date' => '2026-07-28',
            'basic_salary' => 2500,
            'allowances' => 0,
            'gross_salary' => 2500,
            'taxable_income' => 2362.5,
            'income_tax' => 300,
            'ssnit_contribution' => 137.5,
            'employer_ssnit' => 325,
            'loan_deductions' => 0,
            'absence_penalties' => 0,
            'deductions' => 437.5,
            'net_salary' => 2062.5,
            'status' => 'generated',
        ]);

        $this->assertNotNull((new DuplicatePeriodPayment)->detect($payroll, $run));
    }

    public function test_unusually_high_salary_triggers_and_clears(): void
    {
        [, $run, $high] = $this->makePayroll(['salary' => 2500], ['gross_salary' => 8000, 'basic_salary' => 8000]);
        $this->assertNotNull((new UnusuallyHighSalary)->detect($high, $run));

        [, $run2, $normal] = $this->makePayroll(['salary' => 2500], ['gross_salary' => 2500, 'basic_salary' => 2500]);
        $this->assertNull((new UnusuallyHighSalary)->detect($normal, $run2));
    }

    public function test_ssnit_mismatch_triggers_and_clears(): void
    {
        [, $run, $payroll] = $this->makePayroll([], ['ssnit_contribution' => 10, 'basic_salary' => 2500]);
        $rule = new SsnitMismatch(new PayrollCalculator);
        $this->assertNotNull($rule->detect($payroll, $run));

        $payroll->ssnit_contribution = 137.5;
        $this->assertNull($rule->detect($payroll, $run));
    }

    public function test_bank_details_missing_triggers_and_clears(): void
    {
        [$staff, $run, $payroll] = $this->makePayroll(['bank_name' => null, 'bank_account' => null]);
        $this->assertNotNull((new BankDetailsMissing)->detect($payroll, $run));

        $staff->update(['bank_name' => 'GCB', 'bank_account' => '111']);
        $payroll->setRelation('staff', $staff->fresh());
        $this->assertNull((new BankDetailsMissing)->detect($payroll, $run));
    }

    public function test_loan_over_deduction_triggers_and_clears(): void
    {
        [$staff, $run, $payroll] = $this->makePayroll([], ['loan_deductions' => 900]);
        Loan::query()->create([
            'staff_id' => $staff->id,
            'principal' => 1000,
            'outstanding_balance' => 150,
            'monthly_deduction' => 200,
            'status' => 'active',
        ]);
        $payroll->setRelation('staff', $staff->fresh('loans'));
        $this->assertNotNull((new LoanOverDeduction)->detect($payroll, $run));

        $payroll->loan_deductions = 150;
        $this->assertNull((new LoanOverDeduction)->detect($payroll, $run));
    }

    public function test_unauthorized_allowance_triggers_and_clears(): void
    {
        [$staff, $run, $payroll] = $this->makePayroll();
        $type = AllowanceType::query()->create(['name' => 'Bonus', 'code' => 'BONUS']);
        StaffAllowance::query()->create([
            'staff_id' => $staff->id,
            'allowance_type_id' => $type->id,
            'amount' => 1200,
            'is_authorized' => false,
        ]);
        $payroll->setRelation('staff', $staff->fresh(['allowances.allowanceType', 'salaryGrade']));
        $this->assertNotNull((new UnauthorizedAllowance)->detect($payroll, $run));

        $staff->allowances()->update(['is_authorized' => true, 'amount' => 100]);
        $payroll->setRelation('staff', $staff->fresh(['allowances.allowanceType', 'salaryGrade']));
        $this->assertNull((new UnauthorizedAllowance)->detect($payroll, $run));
    }
}
