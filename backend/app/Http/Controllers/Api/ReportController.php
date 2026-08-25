<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\Payroll;
use App\Models\PayrollAnomaly;
use App\Models\PayrollRun;
use App\Models\SchoolClass;
use App\Models\Staff;
use App\Models\StaffAttendance;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function payrollSummary(): JsonResponse
    {
        $runs = PayrollRun::query()
            ->select('id', 'run_name', 'pay_period_start', 'pay_period_end', 'status', 'total_staff', 'total_gross', 'total_deductions', 'total_net')
            ->latest()
            ->limit(12)
            ->get();

        return response()->json([
            'runs' => $runs,
            'totals' => [
                'gross' => $runs->sum('total_gross'),
                'net' => $runs->sum('total_net'),
                'staff' => $runs->sum('total_staff'),
            ],
        ]);
    }

    public function anomalyTrends(): JsonResponse
    {
        $byRule = PayrollAnomaly::query()
            ->select('rule_code', DB::raw('count(*) as total'))
            ->groupBy('rule_code')
            ->orderByDesc('total')
            ->get();

        $bySeverity = PayrollAnomaly::query()
            ->select('severity', DB::raw('count(*) as total'))
            ->groupBy('severity')
            ->get();

        $byStatus = PayrollAnomaly::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->get();

        return response()->json(compact('byRule', 'bySeverity', 'byStatus'));
    }

    public function overview(): JsonResponse
    {
        $runs = PayrollRun::query()
            ->withCount([
                'payrolls',
                'anomalies as open_anomalies_count' => fn ($q) => $q->where('status', 'open'),
                'anomalies as critical_anomalies_count' => fn ($q) => $q->where('severity', 'critical')->where('status', 'open'),
            ])
            ->latest()
            ->limit(12)
            ->get();

        $breakdown = Payroll::query()
            ->whereIn('payroll_run_id', $runs->pluck('id'))
            ->selectRaw('payroll_run_id, sum(basic_salary) as basic, sum(allowances) as allowances, sum(ssnit_contribution) as ssnit, sum(employer_ssnit) as employer_ssnit, sum(loan_deductions) as loans, sum(absence_penalties) as absence')
            ->groupBy('payroll_run_id')
            ->get()
            ->keyBy('payroll_run_id');

        $mappedRuns = $runs->map(function (PayrollRun $run) use ($breakdown) {
            $row = $breakdown->get($run->id);

            return [
                ...$run->toArray(),
                'basic' => round((float) ($row->basic ?? 0), 2),
                'allowances' => round((float) ($row->allowances ?? 0), 2),
                'ssnit' => round((float) ($row->ssnit ?? 0), 2),
                'employer_ssnit' => round((float) ($row->employer_ssnit ?? 0), 2),
                'loans' => round((float) ($row->loans ?? 0), 2),
                'absence' => round((float) ($row->absence ?? 0), 2),
            ];
        });

        $open = PayrollAnomaly::query()->where('status', 'open');
        $today = now()->toDateString();

        return response()->json([
            'payroll' => [
                'runs' => $mappedRuns,
                'totals' => [
                    'runs' => $mappedRuns->count(),
                    'staff' => $mappedRuns->sum('total_staff'),
                    'gross' => round($mappedRuns->sum('total_gross'), 2),
                    'deductions' => round($mappedRuns->sum('total_deductions'), 2),
                    'net' => round($mappedRuns->sum('total_net'), 2),
                    'ssnit' => round($mappedRuns->sum('ssnit'), 2),
                    'employer_ssnit' => round($mappedRuns->sum('employer_ssnit'), 2),
                    'loans' => round($mappedRuns->sum('loans'), 2),
                    'absence' => round($mappedRuns->sum('absence'), 2),
                ],
            ],
            'anomalies' => [
                'open' => (clone $open)->count(),
                'critical_open' => (clone $open)->where('severity', 'critical')->count(),
                'closed' => PayrollAnomaly::query()->whereIn('status', ['resolved', 'false_positive'])->count(),
                'byRule' => PayrollAnomaly::query()
                    ->select('rule_code', DB::raw('count(*) as total'))
                    ->groupBy('rule_code')
                    ->orderByDesc('total')
                    ->get(),
                'bySeverity' => PayrollAnomaly::query()
                    ->select('severity', DB::raw('count(*) as total'))
                    ->groupBy('severity')
                    ->get(),
                'byStatus' => PayrollAnomaly::query()
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')
                    ->get(),
                'openByRule' => (clone $open)
                    ->select('rule_code', DB::raw('count(*) as total'))
                    ->groupBy('rule_code')
                    ->orderByDesc('total')
                    ->get(),
            ],
            'school' => [
                'active_staff' => Staff::query()->where('status', 'active')->count(),
                'inactive_staff' => Staff::query()->where('status', '!=', 'active')->count(),
                'students' => Student::query()->count(),
                'classes' => SchoolClass::query()->count(),
                'pending_leave' => LeaveRequest::query()->whereIn('status', ['pending_hr', 'pending_headteacher'])->count(),
                'approved_leave' => LeaveRequest::query()->where('status', 'approved')->count(),
                'by_department' => DB::table('staff')
                    ->where('status', 'active')
                    ->selectRaw("coalesce(nullif(department, ''), 'Unassigned') as department, count(*) as total")
                    ->groupByRaw("coalesce(nullif(department, ''), 'Unassigned')")
                    ->orderByDesc('total')
                    ->get(),
                'attendance_today' => [
                    'present' => StaffAttendance::query()->whereDate('date', $today)->whereIn('status', ['present', 'late'])->count(),
                    'absent' => StaffAttendance::query()->whereDate('date', $today)->where('status', 'absent')->count(),
                    'on_leave' => StaffAttendance::query()->whereDate('date', $today)->where('status', 'on_leave')->count(),
                    'marked' => StaffAttendance::query()->whereDate('date', $today)->count(),
                ],
            ],
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::query()->with('user')->latest();

        if ($request->filled('action')) {
            $query->where('action', 'like', '%'.$request->string('action').'%');
        }

        return response()->json($query->paginate(30));
    }

    public function notifications(Request $request): JsonResponse
    {
        $query = Notification::query()
            ->where(function ($q) use ($request) {
                $q->whereNull('user_id')->orWhere('user_id', $request->user()->id);
            })
            ->latest();

        return response()->json($query->limit(40)->get());
    }

    public function markNotificationRead(Request $request, Notification $notification): JsonResponse
    {
        $notification->update(['is_read' => true, 'read_at' => now()]);

        return response()->json($notification);
    }
}
