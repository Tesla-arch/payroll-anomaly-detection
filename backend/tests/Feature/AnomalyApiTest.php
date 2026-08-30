<?php

namespace Tests\Feature;

use App\Models\PayrollAnomaly;
use App\Models\PayrollRun;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnomalyApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_hr_officer_can_read_anomaly_summary(): void
    {
        $this->actingAsRole('hr_officer');

        $this->getJson('/api/anomalies/summary')
            ->assertOk()
            ->assertJsonStructure(['open', 'critical_open', 'by_severity', 'by_rule', 'runs']);
    }

    public function test_teacher_cannot_access_anomalies(): void
    {
        $this->actingAsRole('teacher');

        $this->getJson('/api/anomalies/summary')->assertForbidden();
    }

    public function test_accountant_cannot_resolve_an_anomaly(): void
    {
        $this->actingAsRole('accountant');
        $run = PayrollRun::query()->create([
            'run_name' => 'Test',
            'pay_period_start' => '2026-08-01',
            'pay_period_end' => '2026-08-31',
            'payment_date' => '2026-08-28',
            'status' => 'draft',
        ]);
        $anomaly = PayrollAnomaly::query()->create([
            'scan_batch_id' => (string) \Illuminate\Support\Str::uuid(),
            'payroll_run_id' => $run->id,
            'rule_code' => 'Bank_Details_Missing',
            'category' => 'bank',
            'severity' => 'medium',
            'title' => 'Bank missing',
            'description' => 'No bank',
            'evidence' => ['employee_id' => 'EMP-1'],
            'confidence_score' => 80,
            'risk_score' => 40,
            'recommended_action' => 'Collect bank details',
            'status' => 'open',
            'detected_at' => now(),
        ]);

        $this->postJson("/api/anomalies/{$anomaly->id}/resolve", [
            'status' => 'resolved',
            'resolution_notes' => 'Checked',
        ])->assertForbidden();
    }
}
