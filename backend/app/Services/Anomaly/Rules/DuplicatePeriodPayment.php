<?php

namespace App\Services\Anomaly\Rules;

use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Services\Anomaly\AnomalyDraft;
use App\Services\Anomaly\AnomalyRule;

class DuplicatePeriodPayment implements AnomalyRule
{
    public function detect(Payroll $payroll, PayrollRun $run): ?AnomalyDraft
    {
        $duplicates = Payroll::query()
            ->where('staff_id', $payroll->staff_id)
            ->where('id', '!=', $payroll->id)
            ->whereHas('payrollRun', function ($query) use ($run) {
                $query->where('pay_period_start', $run->pay_period_start)
                    ->where('pay_period_end', $run->pay_period_end)
                    ->where('status', '!=', 'cancelled');
            })
            ->count();

        if ($duplicates === 0) {
            return null;
        }

        return new AnomalyDraft(
            'Duplicate_Period_Payment',
            'duplicate_payment',
            'critical',
            'Multiple payments for the same payroll period',
            'This staff member already has another payroll record covering the same pay period.',
            [
                'staff_id' => $payroll->staff_id,
                'employee_id' => $payroll->staff?->employee_id,
                'period_start' => $run->pay_period_start->toDateString(),
                'period_end' => $run->pay_period_end->toDateString(),
                'other_payments' => $duplicates,
            ],
            99,
        );
    }
}
