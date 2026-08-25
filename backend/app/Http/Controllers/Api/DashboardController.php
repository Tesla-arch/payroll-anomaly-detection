<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\PayrollAnomaly;
use App\Models\PayrollRun;
use App\Models\Staff;
use App\Models\StaffAttendance;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        $openAnomalies = PayrollAnomaly::query()->where('status', 'open');
        $today = now()->toDateString();

        $openBySeverity = (clone $openAnomalies)
            ->select('severity', DB::raw('count(*) as total'))
            ->groupBy('severity')
            ->pluck('total', 'severity');

        $openByRule = (clone $openAnomalies)
            ->select('rule_code', DB::raw('count(*) as total'))
            ->groupBy('rule_code')
            ->orderByDesc('total')
            ->limit(6)
            ->get();

        return response()->json([
            'user' => [
                'name' => $user->name,
                'role' => $user->role?->name,
                'slug' => $user->role?->slug,
            ],
            'stats' => [
                'staff' => Staff::query()->count(),
                'active_staff' => Staff::query()->where('status', 'active')->count(),
                'students' => Student::query()->count(),
                'parents' => User::query()->parents()->count(),
                'payroll_runs' => PayrollRun::query()->count(),
                'open_anomalies' => (clone $openAnomalies)->count(),
                'critical_anomalies' => (clone $openAnomalies)->where('severity', 'critical')->count(),
                'pending_leave' => LeaveRequest::query()->whereIn('status', ['pending_hr', 'pending_headteacher'])->count(),
            ],
            'open_by_severity' => [
                'critical' => (int) ($openBySeverity['critical'] ?? 0),
                'high' => (int) ($openBySeverity['high'] ?? 0),
                'medium' => (int) ($openBySeverity['medium'] ?? 0),
                'low' => (int) ($openBySeverity['low'] ?? 0),
            ],
            'open_by_rule' => $openByRule,
            'attendance_today' => [
                'present' => StaffAttendance::query()->whereDate('date', $today)->whereIn('status', ['present', 'late'])->count(),
                'absent' => StaffAttendance::query()->whereDate('date', $today)->where('status', 'absent')->count(),
                'on_leave' => StaffAttendance::query()->whereDate('date', $today)->where('status', 'on_leave')->count(),
                'marked' => StaffAttendance::query()->whereDate('date', $today)->count(),
            ],
            'latest_run' => PayrollRun::query()->latest()->first(),
            'recent_anomalies' => PayrollAnomaly::query()
                ->with(['staff.user', 'payrollRun'])
                ->latest('detected_at')
                ->limit(8)
                ->get(),
            'recent_runs' => PayrollRun::query()->latest()->limit(4)->get(),
            'notifications' => Notification::query()
                ->where(function ($query) use ($user) {
                    $query->whereNull('user_id')->orWhere('user_id', $user->id);
                })
                ->latest()
                ->limit(6)
                ->get(),
        ]);
    }
}
