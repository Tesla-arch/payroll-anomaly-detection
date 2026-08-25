<?php

namespace App\Services\Anomaly\Rules;

use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Services\Anomaly\AnomalyDraft;
use App\Services\Anomaly\AnomalyRule;

class GhostNoUserAccount implements AnomalyRule
{
    public function detect(Payroll $payroll, PayrollRun $run): ?AnomalyDraft
    {
        $staff = $payroll->staff;

        if ($staff && $staff->user_id) {
            return null;
        }

        return new AnomalyDraft(
            'Ghost_No_User_Account',
            'ghost_employee',
            'critical',
            'Salary paid to staff without a user account',
            'This employee is on the payroll but has no linked system user account, a common ghost-employee indicator.',
            [
                'staff_id' => $staff?->id,
                'employee_id' => $staff?->employee_id,
                'user_id' => $staff?->user_id,
                'net_salary' => $payroll->net_salary,
            ],
            95,
        );
    }
}
