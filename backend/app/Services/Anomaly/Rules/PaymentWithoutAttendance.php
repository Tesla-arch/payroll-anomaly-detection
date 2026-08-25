<?php

namespace App\Services\Anomaly\Rules;

use App\Models\LeaveRequest;
use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Models\StaffAttendance;
use App\Services\Anomaly\AnomalyDraft;
use App\Services\Anomaly\AnomalyRule;

class PaymentWithoutAttendance implements AnomalyRule
{
    public function detect(Payroll $payroll, PayrollRun $run): ?AnomalyDraft
    {
        $staff = $payroll->staff;
        if (! $staff) {
            return null;
        }

        $attendanceCount = StaffAttendance::query()
            ->where('staff_id', $staff->id)
            ->whereBetween('date', [$run->pay_period_start->toDateString(), $run->pay_period_end->toDateString()])
            ->whereIn('status', ['present', 'late', 'on_leave'])
            ->count();

        if ($attendanceCount > 0) {
            return null;
        }

        $hasApprovedLeave = LeaveRequest::query()
            ->where('staff_id', $staff->id)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $run->pay_period_end)
            ->whereDate('end_date', '>=', $run->pay_period_start)
            ->exists();

        if ($hasApprovedLeave) {
            return null;
        }

        return new AnomalyDraft(
            'Payment_Without_Attendance',
            'attendance_mismatch',
            'high',
            'Salary paid with no attendance in the pay period',
            'No present/late attendance records exist for this staff member in the payroll period, and no approved leave covers the gap.',
            [
                'staff_id' => $staff->id,
                'employee_id' => $staff->employee_id,
                'period_start' => $run->pay_period_start->toDateString(),
                'period_end' => $run->pay_period_end->toDateString(),
                'attendance_count' => $attendanceCount,
            ],
            90,
        );
    }
}
