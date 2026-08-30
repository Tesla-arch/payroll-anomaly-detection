<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PayrollAnomaly;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\Anomaly\AnomalyDraft;
use App\Services\Anomaly\AnomalyRule;
use App\Services\Anomaly\Rules\BankDetailsMissing;
use App\Services\Anomaly\Rules\DuplicatePeriodPayment;
use App\Services\Anomaly\Rules\GhostInactiveStaff;
use App\Services\Anomaly\Rules\GhostNoUserAccount;
use App\Services\Anomaly\Rules\LoanOverDeduction;
use App\Services\Anomaly\Rules\PaymentWithoutAttendance;
use App\Services\Anomaly\Rules\SsnitMismatch;
use App\Services\Anomaly\Rules\UnauthorizedAllowance;
use App\Services\Anomaly\Rules\UnusuallyHighSalary;
use Illuminate\Support\Str;

class PayrollAnomalyDetectionService
{
    /** @return list<class-string<AnomalyRule>> */
    public function ruleClasses(): array
    {
        return [
            GhostNoUserAccount::class,
            GhostInactiveStaff::class,
            PaymentWithoutAttendance::class,
            DuplicatePeriodPayment::class,
            UnusuallyHighSalary::class,
            SsnitMismatch::class,
            BankDetailsMissing::class,
            LoanOverDeduction::class,
            UnauthorizedAllowance::class,
        ];
    }

    public function scan(PayrollRun $run): array
    {
        $run->load(['payrolls.staff.user', 'payrolls.staff.salaryGrade', 'payrolls.staff.allowances.allowanceType', 'payrolls.staff.loans']);

        $batchId = (string) Str::uuid();
        $created = [];

        foreach ($run->payrolls as $payroll) {
            if ($payroll->status === 'excluded') {
                continue;
            }

            foreach ($this->ruleClasses() as $ruleClass) {
                /** @var AnomalyRule $rule */
                $rule = app($ruleClass);
                $draft = $rule->detect($payroll, $run);
                if (! $draft) {
                    continue;
                }

                $created[] = $this->store($run, $payroll, $draft, $batchId);
            }
        }

        if ($created !== []) {
            $this->notifyReviewers($run, count($created));
        }

        return $created;
    }

    public function scanPayroll(PayrollRun $run, $payroll): array
    {
        if ($payroll->status === 'excluded') {
            return [];
        }

        $payroll->loadMissing(['staff.user', 'staff.salaryGrade', 'staff.allowances.allowanceType', 'staff.loans']);
        $batchId = (string) Str::uuid();
        $created = [];

        foreach ($this->ruleClasses() as $ruleClass) {
            $rule = app($ruleClass);
            $draft = $rule->detect($payroll, $run);
            if (! $draft) {
                continue;
            }

            $created[] = $this->store($run, $payroll, $draft, $batchId);
        }

        return $created;
    }

    protected function store(PayrollRun $run, $payroll, AnomalyDraft $draft, string $batchId): PayrollAnomaly
    {
        $insight = app(PayrollAnomalyInsightService::class)->interpret($draft);

        return PayrollAnomaly::query()->create([
            'scan_batch_id' => $batchId,
            'payroll_run_id' => $run->id,
            'payroll_id' => $payroll->id,
            'staff_id' => $payroll->staff_id,
            'rule_code' => $draft->ruleCode,
            'category' => $draft->category,
            'severity' => $draft->severity,
            'title' => $draft->title,
            'description' => $insight['narrative'],
            'evidence' => $draft->evidence,
            'confidence_score' => $draft->confidenceScore,
            'risk_score' => $insight['risk_score'],
            'recommended_action' => $insight['recommended_action'],
            'status' => 'open',
            'detected_at' => now(),
        ]);
    }

    protected function notifyReviewers(PayrollRun $run, int $count): void
    {
        $users = User::query()
            ->whereHas('role', fn ($q) => $q->whereIn('slug', [
                'super_admin', 'headteacher', 'hr_officer', 'accountant', 'auditor',
            ]))
            ->get();

        foreach ($users as $user) {
            Notification::query()->create([
                'user_id' => $user->id,
                'type' => 'anomaly',
                'title' => "{$count} payroll anomalies detected",
                'message' => "Payroll run '{$run->run_name}' produced {$count} flagged item(s). Review them before approval.",
                'severity' => 'high',
            ]);
        }
    }
}
