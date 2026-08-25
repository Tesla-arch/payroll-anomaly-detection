<?php

namespace App\Services\Anomaly\Rules;

use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Services\Anomaly\AnomalyDraft;
use App\Services\Anomaly\AnomalyRule;

class GhostInactiveStaff implements AnomalyRule
{
    public function detect(Payroll $payroll, PayrollRun $run): ?AnomalyDraft
    {
        $staff = $payroll->staff;

        if (! $staff || $staff->status === 'active') {
            return null;
        }

        return new AnomalyDraft(
            'Ghost_Inactive_Staff',
            'ghost_employee',
            'critical',
            'Inactive employee appears on payroll',
            "Staff member {$staff->employee_id} has status '{$staff->status}' but was included in this payroll run.",
            [
                'staff_id' => $staff->id,
                'employee_id' => $staff->employee_id,
                'status' => $staff->status,
                'net_salary' => $payroll->net_salary,
            ],
            98,
        );
    }
}
