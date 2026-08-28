<?php

namespace Database\Seeders;

use App\Models\AllowanceType;
use App\Models\LeaveRequest;
use App\Models\Loan;
use App\Models\Payroll;
use App\Models\Role;
use App\Models\SalaryGrade;
use App\Models\SchoolClass;
use App\Models\Staff;
use App\Models\StaffAllowance;
use App\Models\StaffAttendance;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Services\PayrollAnomalyDetectionService;
use App\Services\PayrollRunService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (Role::query()->exists()) {
            SchoolClass::syncCatalogue();
            Subject::syncCatalogue();

            return;
        }

        $roles = $this->roles();
        $users = $this->users($roles);
        $grades = $this->grades();
        $allowanceTypes = $this->allowanceTypes();
        $staff = $this->staff($users, $grades, $allowanceTypes);
        $this->students($users, $staff);
        $this->call(AssessmentSeeder::class);
        $this->call(StudentAttendanceSeeder::class);
        $this->attendanceAndLeave($staff);
        $this->payrollDemo($users['payroll'], $staff);
    }

    protected function roles(): array
    {
        $items = [
            'super_admin' => 'Super Admin',
            'headteacher' => 'Headteacher',
            'hr_officer' => 'HR Officer',
            'payroll_officer' => 'Payroll Officer',
            'accountant' => 'Accountant',
            'teacher' => 'Teacher',
            'auditor' => 'Auditor',
            'parent' => 'Parent',
        ];

        $roles = [];
        foreach ($items as $slug => $name) {
            $roles[$slug] = Role::query()->create(compact('name', 'slug'));
        }

        return $roles;
    }

    protected function users(array $roles): array
    {
        $make = function (string $slug, string $first, string $last, string $email) use ($roles) {
            return User::query()->create([
                'role_id' => $roles[$slug]->id,
                'first_name' => $first,
                'last_name' => $last,
                'email' => $email,
                'phone' => '0240000000',
                'password' => 'password',
                'status' => 'active',
            ]);
        };

        return [
            'admin' => $make('super_admin', 'Akosua', 'Owusu', 'admin@school.gh'),
            'head' => $make('headteacher', 'Yaw', 'Asante', 'head@school.gh'),
            'hr' => $make('hr_officer', 'Efua', 'Darko', 'hr@school.gh'),
            'payroll' => $make('payroll_officer', 'Kofi', 'Mensah', 'payroll@school.gh'),
            'accounts' => $make('accountant', 'Abena', 'Sarpong', 'accounts@school.gh'),
            'teacher' => $make('teacher', 'Ama', 'Mensah', 'teacher@school.gh'),
            'auditor' => $make('auditor', 'Nana', 'Adjei', 'auditor@school.gh'),
            'parent' => $make('parent', 'Kwesi', 'Appiah', 'parent@school.gh'),
            'parent2' => $make('parent', 'Akua', 'Owusu', 'parent2@school.gh'),
            'inactiveUser' => $make('teacher', 'Ghost', 'Inactive', 'inactive@school.gh'),
            'leaveUser' => $make('teacher', 'Akua', 'Frimpong', 'leave@school.gh'),
            'highUser' => $make('teacher', 'Kojo', 'Ampofo', 'high@school.gh'),
            'bankUser' => $make('teacher', 'Aba', 'Nyarko', 'nobank@school.gh'),
            'allowUser' => $make('teacher', 'Paa', 'Kwesi', 'allowance@school.gh'),
            'loanUser' => $make('teacher', 'Adwoa', 'Boateng', 'loan@school.gh'),
            'absentUser' => $make('teacher', 'Fiifi', 'Yankson', 'absent@school.gh'),
        ];
    }

    protected function grades(): array
    {
        return [
            't1' => SalaryGrade::query()->create([
                'code' => 'T1', 'name' => 'Teacher Grade 1', 'basic_salary' => 2500, 'max_allowance_total' => 800,
            ]),
            't2' => SalaryGrade::query()->create([
                'code' => 'T2', 'name' => 'Teacher Grade 2', 'basic_salary' => 3200, 'max_allowance_total' => 1000,
            ]),
            'adm' => SalaryGrade::query()->create([
                'code' => 'ADM', 'name' => 'Administration', 'basic_salary' => 4000, 'max_allowance_total' => 1500,
            ]),
        ];
    }

    protected function allowanceTypes(): array
    {
        return [
            'resp' => AllowanceType::query()->create(['name' => 'Responsibility', 'code' => 'RESP', 'is_taxable' => true]),
            'rent' => AllowanceType::query()->create(['name' => 'Rent', 'code' => 'RENT', 'is_taxable' => true]),
            'unauth' => AllowanceType::query()->create(['name' => 'Special Bonus', 'code' => 'BONUS', 'is_taxable' => true]),
        ];
    }

    protected function staff(array $users, array $grades, array $types): array
    {
        $normal = Staff::query()->create([
            'user_id' => $users['teacher']->id,
            'salary_grade_id' => $grades['t1']->id,
            'employee_id' => 'EMP-1001',
            'first_name' => 'Ama',
            'last_name' => 'Mensah',
            'email' => 'teacher@school.gh',
            'department' => 'Lower Primary',
            'job_title' => 'Class Teacher',
            'salary' => 2500,
            'bank_name' => 'GCB Bank',
            'bank_account' => '1234567890',
            'ssnit_number' => 'C12345678901',
            'hire_date' => '2022-01-10',
            'status' => 'active',
        ]);
        StaffAllowance::query()->create([
            'staff_id' => $normal->id, 'allowance_type_id' => $types['resp']->id, 'amount' => 200, 'is_authorized' => true,
        ]);

        $hrStaff = Staff::query()->create([
            'user_id' => $users['hr']->id,
            'salary_grade_id' => $grades['adm']->id,
            'employee_id' => 'EMP-1002',
            'department' => 'Administration',
            'job_title' => 'HR Officer',
            'salary' => 4000,
            'bank_name' => 'Ecobank',
            'bank_account' => '9988776655',
            'ssnit_number' => 'C22345678901',
            'hire_date' => '2020-03-01',
            'status' => 'active',
        ]);

        $ghost = Staff::query()->create([
            'user_id' => null,
            'salary_grade_id' => $grades['t1']->id,
            'employee_id' => 'EMP-GHOST-01',
            'department' => 'Upper Primary',
            'job_title' => 'Teacher',
            'salary' => 2500,
            'bank_name' => 'GCB Bank',
            'bank_account' => '0000001111',
            'ssnit_number' => 'C99900011122',
            'hire_date' => '2019-09-01',
            'status' => 'active',
        ]);

        $inactive = Staff::query()->create([
            'user_id' => $users['inactiveUser']->id,
            'salary_grade_id' => $grades['t1']->id,
            'employee_id' => 'EMP-INACT-01',
            'department' => 'Lower Primary',
            'job_title' => 'Teacher',
            'salary' => 2500,
            'bank_name' => 'GCB Bank',
            'bank_account' => '2222333344',
            'ssnit_number' => 'C11122233344',
            'hire_date' => '2018-01-01',
            'status' => 'inactive',
        ]);

        $absent = Staff::query()->create([
            'user_id' => $users['absentUser']->id,
            'salary_grade_id' => $grades['t1']->id,
            'employee_id' => 'EMP-ABSENT-01',
            'department' => 'KG',
            'job_title' => 'Teacher',
            'salary' => 2500,
            'bank_name' => 'Fidelity',
            'bank_account' => '5555666677',
            'ssnit_number' => 'C55566677788',
            'hire_date' => '2023-02-01',
            'status' => 'active',
        ]);

        $onLeave = Staff::query()->create([
            'user_id' => $users['leaveUser']->id,
            'salary_grade_id' => $grades['t1']->id,
            'employee_id' => 'EMP-LEAVE-01',
            'department' => 'KG',
            'job_title' => 'Teacher',
            'salary' => 2500,
            'bank_name' => 'GCB Bank',
            'bank_account' => '1212121212',
            'ssnit_number' => 'C12121212121',
            'hire_date' => '2021-08-01',
            'status' => 'active',
        ]);

        $high = Staff::query()->create([
            'user_id' => $users['highUser']->id,
            'salary_grade_id' => $grades['t1']->id,
            'employee_id' => 'EMP-HIGH-01',
            'department' => 'JHS',
            'job_title' => 'Teacher',
            'salary' => 8000,
            'bank_name' => 'Stanbic',
            'bank_account' => '7777888899',
            'ssnit_number' => 'C77788899900',
            'hire_date' => '2017-04-01',
            'status' => 'active',
        ]);

        $noBank = Staff::query()->create([
            'user_id' => $users['bankUser']->id,
            'salary_grade_id' => $grades['t2']->id,
            'employee_id' => 'EMP-BANK-01',
            'department' => 'JHS',
            'job_title' => 'Teacher',
            'salary' => 3200,
            'bank_name' => null,
            'bank_account' => null,
            'ssnit_number' => 'C32132132132',
            'hire_date' => '2022-09-01',
            'status' => 'active',
        ]);

        $unauth = Staff::query()->create([
            'user_id' => $users['allowUser']->id,
            'salary_grade_id' => $grades['t1']->id,
            'employee_id' => 'EMP-ALLOW-01',
            'department' => 'Lower Primary',
            'job_title' => 'Teacher',
            'salary' => 2500,
            'bank_name' => 'GCB Bank',
            'bank_account' => '3333444455',
            'ssnit_number' => 'C33344455566',
            'hire_date' => '2020-11-01',
            'status' => 'active',
        ]);
        StaffAllowance::query()->create([
            'staff_id' => $unauth->id, 'allowance_type_id' => $types['unauth']->id, 'amount' => 1200, 'is_authorized' => false,
        ]);

        $loanStaff = Staff::query()->create([
            'user_id' => $users['loanUser']->id,
            'salary_grade_id' => $grades['t2']->id,
            'employee_id' => 'EMP-LOAN-01',
            'department' => 'Upper Primary',
            'job_title' => 'Teacher',
            'salary' => 3200,
            'bank_name' => 'CalBank',
            'bank_account' => '4444555566',
            'ssnit_number' => 'C44455566677',
            'hire_date' => '2019-05-01',
            'status' => 'active',
        ]);
        Loan::query()->create([
            'staff_id' => $loanStaff->id,
            'reference' => 'LN-2026-01',
            'principal' => 2000,
            'outstanding_balance' => 150,
            'monthly_deduction' => 200,
            'status' => 'active',
            'issued_on' => '2025-01-15',
        ]);

        $payrollStaff = Staff::query()->create([
            'user_id' => $users['payroll']->id,
            'salary_grade_id' => $grades['adm']->id,
            'employee_id' => 'EMP-PAY-01',
            'first_name' => 'Kofi',
            'last_name' => 'Mensah',
            'email' => 'payroll@school.gh',
            'department' => 'Accounts',
            'job_title' => 'Payroll Officer',
            'salary' => 4000,
            'bank_name' => 'GCB Bank',
            'bank_account' => '1010101010',
            'ssnit_number' => 'C10101010101',
            'hire_date' => '2021-01-15',
            'status' => 'active',
        ]);

        $accountsStaff = Staff::query()->create([
            'user_id' => $users['accounts']->id,
            'salary_grade_id' => $grades['adm']->id,
            'employee_id' => 'EMP-ACC-01',
            'first_name' => 'Abena',
            'last_name' => 'Sarpong',
            'email' => 'accounts@school.gh',
            'department' => 'Accounts',
            'job_title' => 'Accountant',
            'salary' => 3800,
            'bank_name' => 'Ecobank',
            'bank_account' => '2020202020',
            'ssnit_number' => 'C20202020202',
            'hire_date' => '2020-08-01',
            'status' => 'active',
        ]);

        return compact('normal', 'hrStaff', 'ghost', 'inactive', 'absent', 'onLeave', 'high', 'noBank', 'unauth', 'loanStaff', 'payrollStaff', 'accountsStaff');
    }

    protected function students(array $users, array $staff): void
    {
        SchoolClass::syncCatalogue();

        SchoolClass::query()->where('level', 'Lower Primary')->update(['teacher_id' => $staff['normal']->id]);
        SchoolClass::query()->where('level', 'Upper Primary')->update(['teacher_id' => $staff['loanStaff']->id]);
        SchoolClass::query()->where('level', 'Junior High')->update(['teacher_id' => $staff['noBank']->id]);

        $grade3 = SchoolClass::query()->where('name', 'Grade 3')->where('level', 'Lower Primary')->first();
        $grade5 = SchoolClass::query()->where('name', 'Grade 5')->where('level', 'Upper Primary')->first();
        $jhs1 = SchoolClass::query()->where('name', 'JHS 1')->where('level', 'Junior High')->first();

        Student::query()->create([
            'admission_number' => 'ADM-2024-001',
            'first_name' => 'Kwame',
            'last_name' => 'Appiah',
            'gender' => 'male',
            'date_of_birth' => '2016-05-12',
            'residential_address' => 'Adenta, Accra',
            'class_id' => $grade3?->id,
            'parent_id' => $users['parent']->id,
            'status' => 'active',
        ]);

        Student::query()->create([
            'admission_number' => 'ADM-2024-002',
            'first_name' => 'Ama',
            'last_name' => 'Owusu',
            'gender' => 'female',
            'date_of_birth' => '2016-09-02',
            'residential_address' => 'Madina, Accra',
            'class_id' => $grade5?->id,
            'parent_id' => $users['parent2']->id,
            'status' => 'active',
        ]);

        Student::query()->create([
            'admission_number' => 'ADM-2024-003',
            'first_name' => 'Akosua',
            'last_name' => 'Mensah',
            'gender' => 'female',
            'date_of_birth' => '2013-03-18',
            'residential_address' => 'East Legon, Accra',
            'class_id' => $jhs1?->id,
            'parent_id' => $users['parent']->id,
            'status' => 'active',
        ]);
    }

    protected function attendanceAndLeave(array $staff): void
    {
        $start = Carbon::parse('2026-07-01');
        $end = Carbon::parse('2026-07-22');

        foreach (['normal', 'hrStaff', 'high', 'noBank', 'unauth', 'loanStaff', 'ghost'] as $key) {
            for ($day = $start->copy(); $day->lte($end); $day->addDay()) {
                if ($day->isWeekend()) {
                    continue;
                }
                StaffAttendance::query()->create([
                    'staff_id' => $staff[$key]->id,
                    'date' => $day->toDateString(),
                    'check_in_time' => '07:45',
                    'check_out_time' => '14:30',
                    'hours_worked' => 6.75,
                    'status' => 'present',
                ]);
            }
        }

        LeaveRequest::query()->create([
            'staff_id' => $staff['onLeave']->id,
            'leave_type' => 'annual',
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-31',
            'days_requested' => 31,
            'reason' => 'Approved annual leave',
            'status' => 'approved',
            'payroll_notified' => true,
        ]);
    }

    protected function payrollDemo(User $officer, array $staff): void
    {
        $service = app(PayrollRunService::class);
        $ids = collect($staff)->except(['payrollStaff', 'accountsStaff'])->pluck('id')->all();

        $run = $service->execute([
            'run_name' => 'July 2026 Payroll',
            'pay_period_start' => '2026-07-01',
            'pay_period_end' => '2026-07-31',
            'payment_date' => '2026-07-28',
            'staff_ids' => $ids,
        ], $officer);

        $ssnitLine = Payroll::query()->where('payroll_run_id', $run->id)->where('staff_id', $staff['hrStaff']->id)->first();
        $ssnitLine?->update(['ssnit_contribution' => 10.00]);

        $loanLine = Payroll::query()->where('payroll_run_id', $run->id)->where('staff_id', $staff['loanStaff']->id)->first();
        $loanLine?->update(['loan_deductions' => 900.00, 'deductions' => (float) $loanLine->deductions + 700]);

        Payroll::query()->create([
            'payroll_run_id' => $run->id,
            'staff_id' => $staff['normal']->id,
            'payment_date' => $run->payment_date,
            'basic_salary' => 2500,
            'allowances' => 200,
            'gross_salary' => 2700,
            'taxable_income' => 0,
            'income_tax' => 0,
            'ssnit_contribution' => 137.5,
            'employer_ssnit' => 325,
            'loan_deductions' => 0,
            'absence_penalties' => 0,
            'deductions' => 137.5,
            'net_salary' => 2562.5,
            'status' => 'generated',
        ]);

        $run->anomalies()->delete();
        app(PayrollAnomalyDetectionService::class)->scan($run->fresh('payrolls'));
        $service->refreshTotals($run->fresh());
    }
}
