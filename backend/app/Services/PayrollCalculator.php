<?php

namespace App\Services;

use App\Models\LeaveRequest;
use App\Models\Staff;
use App\Models\StaffAttendance;
use Carbon\CarbonInterface;

class PayrollCalculator
{
    public function calculate(Staff $staff, CarbonInterface $periodStart, CarbonInterface $periodEnd, array $overrides = []): array
    {
        $staff->loadMissing(['allowances', 'loans', 'salaryGrade']);

        $basic = round((float) ($overrides['basic_salary'] ?? $staff->salary), 2);
        $allowances = round((float) ($overrides['allowances'] ?? $staff->allowances->sum('amount')), 2);
        $gross = round($basic + $allowances, 2);

        $ssnit = round((float) ($overrides['ssnit_contribution'] ?? $this->employeeSsnit($basic)), 2);
        $employerSsnit = round($this->cappedInsurable($basic) * (float) config('payroll.ssnit.employer_rate'), 2);

        $loan = $this->loanDeduction($staff, $overrides);
        $penalties = round((float) ($overrides['absence_penalties'] ?? $this->absencePenalties($staff, $periodStart, $periodEnd, $basic)), 2);
        $other = round((float) ($overrides['other_deductions'] ?? 0), 2);

        $deductions = round($ssnit + $loan + $penalties + $other, 2);
        $net = round($gross - $deductions, 2);

        return [
            'basic_salary' => $basic,
            'allowances' => $allowances,
            'gross_salary' => $gross,
            'ssnit_contribution' => $ssnit,
            'employer_ssnit' => $employerSsnit,
            'taxable_income' => 0,
            'income_tax' => 0,
            'loan_deductions' => $loan,
            'absence_penalties' => $penalties,
            'deductions' => $deductions,
            'net_salary' => $net,
        ];
    }

    public function expectedSsnit(float $basicSalary): float
    {
        return round($this->employeeSsnit($basicSalary), 2);
    }

    public function employeeSsnit(float $basicSalary): float
    {
        return $this->cappedInsurable($basicSalary) * (float) config('payroll.ssnit.employee_rate');
    }

    public function cappedInsurable(float $basicSalary): float
    {
        $min = (float) config('payroll.ssnit.min_insurable');
        $max = (float) config('payroll.ssnit.max_insurable');

        if ($basicSalary <= 0) {
            return 0;
        }

        return min(max($basicSalary, $min), $max);
    }

    protected function loanDeduction(Staff $staff, array $overrides): float
    {
        if (array_key_exists('loan_deductions', $overrides)) {
            return round((float) $overrides['loan_deductions'], 2);
        }

        $loan = $staff->loans->firstWhere('status', 'active');
        if (! $loan) {
            return 0;
        }

        return round(min((float) $loan->monthly_deduction, (float) $loan->outstanding_balance), 2);
    }

    protected function absencePenalties(Staff $staff, CarbonInterface $periodStart, CarbonInterface $periodEnd, float $basic): float
    {
        $absentDays = StaffAttendance::query()
            ->where('staff_id', $staff->id)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->whereIn('status', ['absent', 'unpaid_leave'])
            ->count();

        $penaltyFromRecords = (float) StaffAttendance::query()
            ->where('staff_id', $staff->id)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->sum('penalty_amount');

        $approvedLeaveDays = LeaveRequest::query()
            ->where('staff_id', $staff->id)
            ->where('status', 'approved')
            ->where(function ($query) use ($periodStart, $periodEnd) {
                $query->whereDate('start_date', '<=', $periodEnd)
                    ->whereDate('end_date', '>=', $periodStart);
            })
            ->get()
            ->sum(function (LeaveRequest $leave) use ($periodStart, $periodEnd) {
                $start = $leave->start_date->greaterThan($periodStart) ? $leave->start_date : $periodStart;
                $end = $leave->end_date->lessThan($periodEnd) ? $leave->end_date : $periodEnd;

                return $start->diffInDays($end) + 1;
            });

        $billableAbsent = max($absentDays - $approvedLeaveDays, 0);
        $dailyRate = $basic * (float) config('payroll.anomaly.daily_absence_penalty_rate');
        $computed = round($billableAbsent * $dailyRate, 2);

        return max($computed, round($penaltyFromRecords, 2));
    }
}
