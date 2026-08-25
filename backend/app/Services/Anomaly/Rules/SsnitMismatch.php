<?php

namespace App\Services\Anomaly\Rules;

use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Services\Anomaly\AnomalyDraft;
use App\Services\Anomaly\AnomalyRule;
use App\Services\PayrollCalculator;

class SsnitMismatch implements AnomalyRule
{
    public function __construct(private PayrollCalculator $calculator) {}

    public function detect(Payroll $payroll, PayrollRun $run): ?AnomalyDraft
    {
        $expected = $this->calculator->expectedSsnit((float) $payroll->basic_salary);
        $actual = (float) $payroll->ssnit_contribution;

        if (abs($expected - $actual) < 0.01) {
            return null;
        }

        return new AnomalyDraft(
            'Ssnit_Mismatch',
            'deduction',
            'high',
            'Incorrect SSNIT deduction',
            "Employee SSNIT should be GHS {$expected} (5.5% of capped basic) but the payroll recorded GHS {$actual}.",
            [
                'basic_salary' => $payroll->basic_salary,
                'expected_ssnit' => $expected,
                'actual_ssnit' => $actual,
                'difference' => round($actual - $expected, 2),
            ],
            97,
        );
    }
}
