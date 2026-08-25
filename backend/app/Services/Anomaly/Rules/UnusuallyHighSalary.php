<?php

namespace App\Services\Anomaly\Rules;

use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Services\Anomaly\AnomalyDraft;
use App\Services\Anomaly\AnomalyRule;

class UnusuallyHighSalary implements AnomalyRule
{
    public function detect(Payroll $payroll, PayrollRun $run): ?AnomalyDraft
    {
        $staff = $payroll->staff;
        $grade = $staff?->salaryGrade;
        $multiplier = (float) config('payroll.anomaly.high_salary_multiplier', 1.5);

        $baseline = (float) ($grade?->basic_salary ?: $staff?->salary ?: 0);
        if ($baseline <= 0) {
            return null;
        }

        $threshold = round($baseline * $multiplier, 2);
        $gross = (float) $payroll->gross_salary;

        if ($gross <= $threshold) {
            return null;
        }

        return new AnomalyDraft(
            'Unusually_High_Salary',
            'salary_adjustment',
            'high',
            'Salary exceeds historical / grade threshold',
            "Gross pay of GHS {$gross} exceeds {$multiplier}x the expected baseline of GHS {$baseline}.",
            [
                'gross_salary' => $gross,
                'baseline' => $baseline,
                'threshold' => $threshold,
                'multiplier' => $multiplier,
                'grade' => $grade?->code,
            ],
            85,
        );
    }
}
