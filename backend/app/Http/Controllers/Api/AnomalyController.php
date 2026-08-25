<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollAnomaly;
use App\Models\PayrollRun;
use App\Services\PayrollAnomalyDetectionService;
use App\Support\Auditor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnomalyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PayrollAnomaly::query()->with(['staff.user', 'payrollRun', 'payroll', 'resolver']);

        if ($request->filled('status') && $request->string('status') !== 'all') {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('severity') && $request->string('severity') !== 'all') {
            $query->where('severity', $request->string('severity'));
        }
        if ($request->filled('rule_code')) {
            $query->where('rule_code', $request->string('rule_code'));
        }
        if ($request->filled('payroll_run_id')) {
            $query->where('payroll_run_id', $request->integer('payroll_run_id'));
        }
        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->integer('staff_id'));
        }
        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('rule_code', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('staff', function ($staff) use ($search) {
                        $staff->where('employee_id', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('department', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = min(100, max(10, $request->integer('per_page', 40)));

        return response()->json($query->latest('detected_at')->paginate($perPage));
    }

    public function summary(): JsonResponse
    {
        $open = PayrollAnomaly::query()->where('status', 'open');

        return response()->json([
            'open' => (clone $open)->count(),
            'critical_open' => (clone $open)->where('severity', 'critical')->count(),
            'high_open' => (clone $open)->where('severity', 'high')->count(),
            'resolved' => PayrollAnomaly::query()->whereIn('status', ['resolved', 'false_positive'])->count(),
            'by_status' => PayrollAnomaly::query()
                ->select('status', DB::raw('count(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status'),
            'by_severity' => (clone $open)
                ->select('severity', DB::raw('count(*) as total'))
                ->groupBy('severity')
                ->pluck('total', 'severity'),
            'by_rule' => (clone $open)
                ->select('rule_code', DB::raw('count(*) as total'))
                ->groupBy('rule_code')
                ->orderByDesc('total')
                ->get(),
            'runs' => PayrollRun::query()
                ->withCount([
                    'anomalies as open_anomalies_count' => fn ($q) => $q->where('status', 'open'),
                    'anomalies as critical_anomalies_count' => fn ($q) => $q->where('severity', 'critical')->where('status', 'open'),
                ])
                ->latest()
                ->limit(12)
                ->get(),
        ]);
    }

    public function show(PayrollAnomaly $payrollAnomaly): JsonResponse
    {
        $payrollAnomaly->load(['staff.user', 'payroll', 'payrollRun', 'resolver']);

        $related = PayrollAnomaly::query()
            ->where('id', '!=', $payrollAnomaly->id)
            ->where(function ($query) use ($payrollAnomaly) {
                $query->where('staff_id', $payrollAnomaly->staff_id)
                    ->orWhere('payroll_run_id', $payrollAnomaly->payroll_run_id);
            })
            ->latest('detected_at')
            ->limit(8)
            ->get(['id', 'staff_id', 'payroll_run_id', 'rule_code', 'title', 'severity', 'status', 'risk_score', 'detected_at']);

        return response()->json([
            ...$payrollAnomaly->toArray(),
            'related' => $related,
        ]);
    }

    public function resolve(Request $request, PayrollAnomaly $payrollAnomaly): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:acknowledged,false_positive,resolved'],
            'resolution_notes' => ['required', 'string'],
        ]);

        $payrollAnomaly->update([
            'status' => $data['status'],
            'resolution_notes' => $data['resolution_notes'],
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        Auditor::log('anomaly.'.$data['status'], $payrollAnomaly, $data, $request->user(), $request);

        return response()->json($payrollAnomaly->fresh(['staff', 'resolver']));
    }

    public function rescan(Request $request, PayrollRun $payrollRun, PayrollAnomalyDetectionService $detector): JsonResponse
    {
        $payrollRun->anomalies()->delete();
        $created = $detector->scan($payrollRun);
        Auditor::log('anomaly.rescanned', $payrollRun, ['count' => count($created)], $request->user(), $request);

        return response()->json([
            'detected' => count($created),
            'anomalies' => $payrollRun->fresh()->anomalies()->with('staff')->get(),
        ]);
    }
}
