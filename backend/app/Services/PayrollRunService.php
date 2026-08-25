<?php

namespace App\Services;

use App\Models\Loan;
use App\Models\Payroll;
use App\Models\PayrollAnomaly;
use App\Models\PayrollRun;
use App\Models\Staff;
use App\Models\User;
use App\Support\Auditor;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayrollRunService
{
    public function __construct(
        private PayrollCalculator $calculator,
        private PayrollAnomalyDetectionService $detector,
    ) {}

    public function execute(array $data, User $actor): PayrollRun
    {
        return DB::transaction(function () use ($data, $actor) {
            $run = PayrollRun::query()->create([
                'run_name' => $data['run_name'],
                'pay_period_start' => $data['pay_period_start'],
                'pay_period_end' => $data['pay_period_end'],
                'payment_date' => $data['payment_date'],
                'status' => 'draft',
                'created_by' => $actor->id,
            ]);

            $staff = $this->staffForRun($data);

            foreach ($staff as $member) {
                $calc = $this->calculator->calculate(
                    $member,
                    $run->pay_period_start,
                    $run->pay_period_end,
                    $data['overrides'][$member->id] ?? [],
                );

                Payroll::query()->create([
                    'payroll_run_id' => $run->id,
                    'staff_id' => $member->id,
                    'payment_date' => $run->payment_date,
                    'status' => 'generated',
                    ...$calc,
                ]);
            }

            $this->refreshTotals($run);
            $this->detector->scan($run->fresh('payrolls'));

            Auditor::log('payroll_run.executed', $run, [
                'staff_count' => $run->total_staff,
            ], $actor);

            return $run->fresh(['payrolls.staff', 'anomalies']);
        });
    }

    public function approve(PayrollRun $run, User $actor): PayrollRun
    {
        if ($run->hasOpenCriticalAnomalies()) {
            throw ValidationException::withMessages([
                'status' => 'Cannot approve payroll while critical anomalies remain open.',
            ]);
        }

        $run->update([
            'status' => 'approved',
            'approved_by' => $actor->id,
            'approved_at' => now(),
        ]);

        Auditor::log('payroll_run.approved', $run, [], $actor);

        return $run->fresh();
    }

    public function markPaid(PayrollRun $run, User $actor): PayrollRun
    {
        if ($run->status !== 'approved') {
            throw ValidationException::withMessages([
                'status' => 'Payroll must be approved before it can be marked as paid.',
            ]);
        }

        if ($run->hasOpenCriticalAnomalies()) {
            throw ValidationException::withMessages([
                'status' => 'Cannot mark payroll as paid while critical anomalies remain open.',
            ]);
        }

        foreach ($run->payrolls as $payroll) {
            if ($payroll->status === 'excluded') {
                continue;
            }

            $this->applyLoanDeduction($payroll);
            $payroll->update(['status' => 'paid']);
        }

        $run->update(['status' => 'paid']);
        Auditor::log('payroll_run.paid', $run, [], $actor);

        return $run->fresh();
    }

    public function exclude(Payroll $payroll, User $actor, ?string $notes = null): PayrollRun
    {
        $run = $payroll->payrollRun;
        $this->assertDraft($run);

        if ($payroll->status === 'excluded') {
            return $run->fresh(['payrolls.staff.user', 'anomalies.staff']);
        }

        $payroll->update(['status' => 'excluded']);

        $note = $notes ?: 'Removed from this salary run so the person is not paid this period.';
        PayrollAnomaly::query()
            ->where('payroll_id', $payroll->id)
            ->where('status', 'open')
            ->update([
                'status' => 'resolved',
                'resolution_notes' => $note,
                'resolved_by' => $actor->id,
                'resolved_at' => now(),
            ]);

        $this->refreshTotals($run);
        Auditor::log('payroll.excluded', $payroll, [
            'staff_id' => $payroll->staff_id,
            'payroll_run_id' => $run->id,
        ], $actor);

        return $run->fresh(['payrolls.staff.user', 'anomalies.staff']);
    }

    public function restore(Payroll $payroll, User $actor): PayrollRun
    {
        $run = $payroll->payrollRun;
        $this->assertDraft($run);

        $payroll->update(['status' => 'generated']);
        PayrollAnomaly::query()->where('payroll_id', $payroll->id)->delete();
        $this->detector->scanPayroll($run, $payroll->fresh('staff'));
        $this->refreshTotals($run);
        Auditor::log('payroll.restored', $payroll, ['payroll_run_id' => $run->id], $actor);

        return $run->fresh(['payrolls.staff.user', 'anomalies.staff']);
    }

    public function recalculate(Payroll $payroll, User $actor): PayrollRun
    {
        $run = $payroll->payrollRun()->first() ?? $payroll->payrollRun;
        $this->assertDraft($run);

        if ($payroll->status === 'excluded') {
            throw ValidationException::withMessages([
                'status' => 'Restore this staff on the run before recalculating their slip.',
            ]);
        }

        $member = $payroll->staff()->with(['allowances.allowanceType', 'loans', 'salaryGrade', 'user'])->first();
        $calc = $this->calculator->calculate($member, $run->pay_period_start, $run->pay_period_end);
        $payroll->update($calc);
        PayrollAnomaly::query()->where('payroll_id', $payroll->id)->delete();
        $this->detector->scanPayroll($run, $payroll->fresh('staff'));
        $this->refreshTotals($run);
        Auditor::log('payroll.recalculated', $payroll, ['payroll_run_id' => $run->id], $actor);

        return $run->fresh(['payrolls.staff.user', 'anomalies.staff']);
    }

    public function refreshTotals(PayrollRun $run): void
    {
        $payrolls = $run->payrolls()->where('status', '!=', 'excluded')->get();

        $run->update([
            'total_staff' => $payrolls->count(),
            'total_gross' => $payrolls->sum('gross_salary'),
            'total_deductions' => $payrolls->sum('deductions'),
            'total_net' => $payrolls->sum('net_salary'),
        ]);
    }

    protected function staffForRun(array $data)
    {
        $query = Staff::query()->with(['allowances.allowanceType', 'loans', 'salaryGrade', 'user']);

        if (! empty($data['staff_ids'])) {
            return $query->whereIn('id', $data['staff_ids'])->get();
        }

        return $query->where('status', 'active')->get();
    }

    protected function applyLoanDeduction(Payroll $payroll): void
    {
        $amount = (float) $payroll->loan_deductions;
        if ($amount <= 0) {
            return;
        }

        $loan = Loan::query()
            ->where('staff_id', $payroll->staff_id)
            ->where('status', 'active')
            ->orderByDesc('id')
            ->first();

        if (! $loan) {
            return;
        }

        $newBalance = max((float) $loan->outstanding_balance - $amount, 0);
        $loan->update([
            'outstanding_balance' => $newBalance,
            'status' => $newBalance <= 0.01 ? 'closed' : 'active',
        ]);
    }

    protected function assertDraft(?PayrollRun $run): void
    {
        if (! $run || $run->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => 'Staff can only be edited off a draft salary run. Cancel and prepare again if this run is already signed.',
            ]);
        }
    }
}
