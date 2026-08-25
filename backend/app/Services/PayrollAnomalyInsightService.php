<?php

namespace App\Services;

use App\Services\Anomaly\AnomalyDraft;

class PayrollAnomalyInsightService
{
    public function interpret(AnomalyDraft $draft): array
    {
        $severityWeight = match ($draft->severity) {
            'critical' => 40,
            'high' => 30,
            'medium' => 18,
            default => 8,
        };

        $categoryWeight = match ($draft->category) {
            'ghost_employee', 'duplicate_payment' => 40,
            'deduction', 'allowance', 'salary_adjustment' => 25,
            'attendance_mismatch' => 20,
            default => 10,
        };

        $risk = min(100, round($severityWeight + $categoryWeight + ($draft->confidenceScore * 0.2), 2));

        return [
            'risk_score' => $risk,
            'risk_level' => $this->level($risk),
            'narrative' => $draft->description,
            'recommended_action' => $this->action($draft),
        ];
    }

    protected function level(float $score): string
    {
        return match (true) {
            $score >= 80 => 'critical',
            $score >= 60 => 'high',
            $score >= 40 => 'medium',
            default => 'low',
        };
    }

    protected function action(AnomalyDraft $draft): string
    {
        return match ($draft->ruleCode) {
            'Ghost_No_User_Account' => 'Hold payment and create or link a valid user account before re-running payroll.',
            'Ghost_Inactive_Staff' => 'Remove the inactive employee from this run and confirm employment status with HR.',
            'Payment_Without_Attendance' => 'Verify attendance registers or confirm approved leave with the Headteacher.',
            'Duplicate_Period_Payment' => 'Cancel the duplicate payroll line and keep a single payment for the period.',
            'Unusually_High_Salary' => 'Confirm the salary change against an approved increment letter or salary grade.',
            'Ssnit_Mismatch' => 'Recalculate employee SSNIT at 5.5% of capped basic salary and correct the deduction.',
            'Bank_Details_Missing' => 'Collect the staff bank name and account number before marking the run as paid.',
            'Loan_Over_Deduction' => 'Cap the deduction at the outstanding loan balance and update the loan ledger.',
            'Unauthorized_Allowance' => 'Remove unauthorized allowances or obtain written authorization from the Headteacher.',
            default => 'Investigate the evidence, record findings, and resolve or mark as a false positive.',
        };
    }
}
