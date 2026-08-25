<?php

namespace App\Services\Anomaly\Rules;

use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Services\Anomaly\AnomalyDraft;
use App\Services\Anomaly\AnomalyRule;

class LoanOverDeduction implements AnomalyRule
{
    public function detect(Payroll $payroll, PayrollRun $run): ?AnomalyDraft
    {
        $loan = $payroll->staff?->loans->firstWhere('status', 'active');
        $deducted = (float) $payroll->loan_deductions;

        if ($deducted <= 0) {
            return null;
        }

        $outstanding = (float) ($loan?->outstanding_balance ?? 0);

        if ($deducted <= $outstanding + 0.01) {
            return null;
        }

        return new AnomalyDraft(
            'Loan_Over_Deduction',
            'deduction',
            'high',
            'Loan deduction exceeds outstanding balance',
            "Payroll deducted GHS {$deducted} against an outstanding loan balance of GHS {$outstanding}.",
            [
                'loan_id' => $loan?->id,
                'outstanding_balance' => $outstanding,
                'loan_deductions' => $deducted,
                'has_active_loan' => (bool) $loan,
            ],
            94,
        );
    }
}
