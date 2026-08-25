<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Services\PayrollRunService;
use App\Support\Auditor;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PayrollRunController extends Controller
{
    public function __construct(private PayrollRunService $runs) {}

    public function index(Request $request): JsonResponse
    {
        $query = PayrollRun::query()
            ->with('creator')
            ->withCount([
                'payrolls',
                'anomalies',
                'anomalies as open_anomalies_count' => fn ($q) => $q->where('status', 'open'),
                'anomalies as critical_anomalies_count' => fn ($q) => $q->where('severity', 'critical')->where('status', 'open'),
            ]);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'run_name' => ['required', 'string', 'max:150'],
            'pay_period_start' => ['required', 'date'],
            'pay_period_end' => ['required', 'date', 'after_or_equal:pay_period_start'],
            'payment_date' => ['required', 'date'],
            'staff_ids' => ['nullable', 'array'],
            'staff_ids.*' => ['integer', 'exists:staff,id'],
        ]);

        $run = $this->runs->execute($data, $request->user());

        return response()->json($run, 201);
    }

    public function show(PayrollRun $payrollRun): JsonResponse
    {
        return response()->json($payrollRun->load([
            'payrolls.staff.user',
            'anomalies.staff',
            'creator',
            'approver',
        ]));
    }

    public function approve(Request $request, PayrollRun $payrollRun): JsonResponse
    {
        return response()->json($this->runs->approve($payrollRun, $request->user()));
    }

    public function markPaid(Request $request, PayrollRun $payrollRun): JsonResponse
    {
        return response()->json($this->runs->markPaid($payrollRun, $request->user()));
    }

    public function cancel(Request $request, PayrollRun $payrollRun): JsonResponse
    {
        $payrollRun->update(['status' => 'cancelled']);
        Auditor::log('payroll_run.cancelled', $payrollRun, [], $request->user(), $request);

        return response()->json($payrollRun);
    }

    public function exclude(Request $request, Payroll $payroll): JsonResponse
    {
        $notes = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ])['notes'] ?? null;

        return response()->json($this->runs->exclude($payroll, $request->user(), $notes));
    }

    public function restore(Request $request, Payroll $payroll): JsonResponse
    {
        return response()->json($this->runs->restore($payroll, $request->user()));
    }

    public function recalculate(Request $request, Payroll $payroll): JsonResponse
    {
        return response()->json($this->runs->recalculate($payroll, $request->user()));
    }

    public function payslip(Payroll $payroll): Response
    {
        $payroll->load(['staff.user', 'payrollRun']);
        $pdf = Pdf::loadView('payslip', ['payroll' => $payroll]);

        return $pdf->download('payslip-'.$payroll->staff?->employee_id.'.pdf');
    }
}
