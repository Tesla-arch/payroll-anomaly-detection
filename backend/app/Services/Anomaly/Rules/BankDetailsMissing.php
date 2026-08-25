<?php

namespace App\Services\Anomaly\Rules;

use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Services\Anomaly\AnomalyDraft;
use App\Services\Anomaly\AnomalyRule;

class BankDetailsMissing implements AnomalyRule
{
    public function detect(Payroll $payroll, PayrollRun $run): ?AnomalyDraft
    {
        $staff = $payroll->staff;
        $bankName = trim((string) $staff?->bank_name);
        $bankAccount = trim((string) $staff?->bank_account);

        if ($bankName !== '' && $bankAccount !== '') {
            return null;
        }

        return new AnomalyDraft(
            'Bank_Details_Missing',
            'data_quality',
            'medium',
            'Missing bank information',
            'This staff record has no complete bank name and account number, so the salary cannot be paid reliably.',
            [
                'staff_id' => $staff?->id,
                'employee_id' => $staff?->employee_id,
                'bank_name' => $staff?->bank_name,
                'bank_account' => $staff?->bank_account,
            ],
            92,
        );
    }
}
