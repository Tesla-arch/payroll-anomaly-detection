<?php

namespace App\Services\Anomaly\Rules;

use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Services\Anomaly\AnomalyDraft;
use App\Services\Anomaly\AnomalyRule;

class UnauthorizedAllowance implements AnomalyRule
{
    public function detect(Payroll $payroll, PayrollRun $run): ?AnomalyDraft
    {
        $staff = $payroll->staff;
        if (! $staff) {
            return null;
        }

        $unauthorized = $staff->allowances
            ->filter(fn ($allowance) => $allowance->is_authorized === false)
            ->values();

        $gradeCap = (float) ($staff->salaryGrade?->max_allowance_total ?? 0);
        $totalAllowances = (float) $staff->allowances->sum('amount');
        $overCap = $gradeCap > 0 && $totalAllowances > $gradeCap + 0.01;

        if ($unauthorized->isEmpty() && ! $overCap) {
            return null;
        }

        return new AnomalyDraft(
            'Unauthorized_Allowance',
            'allowance',
            'high',
            'Unauthorized or excessive allowance',
            'One or more allowances are not authorized, or the total exceeds the salary grade cap.',
            [
                'unauthorized_count' => $unauthorized->count(),
                'unauthorized_items' => $unauthorized->map(fn ($item) => [
                    'id' => $item->id,
                    'amount' => $item->amount,
                    'type' => $item->allowanceType?->name,
                ])->all(),
                'total_allowances' => $totalAllowances,
                'grade_cap' => $gradeCap,
                'over_cap' => $overCap,
            ],
            88,
        );
    }
}
