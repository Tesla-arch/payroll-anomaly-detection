<?php

namespace Tests\Feature;

use App\Models\Staff;
use App\Models\StaffAttendance;
use App\Services\PayrollRunService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PayrollFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_payroll_run_creates_lines_and_scans_anomalies(): void
    {
        $officer = $this->userWithRole('payroll_officer');
        $staff = Staff::query()->create([
            'user_id' => $this->userWithRole('teacher')->id,
            'employee_id' => 'EMP-3001',
            'salary' => 2500,
            'status' => 'active',
            'bank_name' => 'GCB',
            'bank_account' => '123',
        ]);
        StaffAttendance::query()->create([
            'staff_id' => $staff->id,
            'date' => '2026-07-05',
            'status' => 'present',
        ]);

        $run = app(PayrollRunService::class)->execute([
            'run_name' => 'July Test',
            'pay_period_start' => '2026-07-01',
            'pay_period_end' => '2026-07-31',
            'payment_date' => '2026-07-28',
        ], $officer);

        $this->assertSame(1, $run->payrolls()->count());
        $line = $run->payrolls()->first();
        $this->assertEquals(137.5, (float) $line->ssnit_contribution);
        $this->assertEquals(0.0, (float) $line->income_tax);
        $this->assertEquals(2362.5, (float) $line->net_salary);
    }

    public function test_cannot_approve_with_open_critical_anomalies(): void
    {
        $officer = $this->userWithRole('payroll_officer');
        $head = $this->userWithRole('headteacher');

        Staff::query()->create([
            'user_id' => null,
            'employee_id' => 'EMP-GHOST',
            'salary' => 2500,
            'status' => 'active',
        ]);

        $run = app(PayrollRunService::class)->execute([
            'run_name' => 'Ghost Run',
            'pay_period_start' => '2026-07-01',
            'pay_period_end' => '2026-07-31',
            'payment_date' => '2026-07-28',
            'staff_ids' => Staff::query()->pluck('id')->all(),
        ], $officer);

        $this->assertTrue($run->anomalies()->where('rule_code', 'Ghost_No_User_Account')->exists());

        Sanctum::actingAs($head);

        $this->postJson("/api/payroll-runs/{$run->id}/approve")
            ->assertStatus(422);
    }

    public function test_payroll_officer_can_remove_flagged_staff_from_a_draft_run(): void
    {
        $officer = $this->actingAsRole('payroll_officer');

        Staff::query()->create([
            'user_id' => null,
            'employee_id' => 'EMP-DROP',
            'salary' => 2500,
            'status' => 'active',
        ]);

        $run = app(PayrollRunService::class)->execute([
            'run_name' => 'Drop Ghost',
            'pay_period_start' => '2026-07-01',
            'pay_period_end' => '2026-07-31',
            'payment_date' => '2026-07-28',
            'staff_ids' => Staff::query()->pluck('id')->all(),
        ], $officer);

        $line = $run->payrolls()->first();
        $this->assertTrue($run->hasOpenCriticalAnomalies());

        $this->postJson("/api/payrolls/{$line->id}/exclude")
            ->assertOk()
            ->assertJsonPath('total_staff', 0);

        $this->assertSame('excluded', $line->fresh()->status);
        $this->assertFalse($run->fresh()->hasOpenCriticalAnomalies());

        $head = $this->userWithRole('headteacher');
        Sanctum::actingAs($head);
        $this->postJson("/api/payroll-runs/{$run->id}/approve")->assertOk();
    }

    public function test_hr_can_read_anomalies_but_cannot_remove_a_payroll_line(): void
    {
        $officer = $this->userWithRole('payroll_officer');
        Staff::query()->create([
            'user_id' => null,
            'employee_id' => 'EMP-HR',
            'salary' => 2000,
            'status' => 'active',
        ]);
        $run = app(PayrollRunService::class)->execute([
            'run_name' => 'HR View',
            'pay_period_start' => '2026-07-01',
            'pay_period_end' => '2026-07-31',
            'payment_date' => '2026-07-28',
            'staff_ids' => Staff::query()->pluck('id')->all(),
        ], $officer);

        $this->actingAsRole('hr_officer');
        $this->getJson('/api/anomalies/summary')->assertOk();
        $this->postJson('/api/payrolls/'.$run->payrolls()->first()->id.'/exclude')->assertForbidden();
    }

    public function test_cannot_remove_staff_from_an_approved_run(): void
    {
        $officer = $this->actingAsRole('payroll_officer');
        $teacher = $this->userWithRole('teacher');
        $staff = Staff::query()->create([
            'user_id' => $teacher->id,
            'employee_id' => 'EMP-OK',
            'salary' => 2500,
            'status' => 'active',
            'bank_name' => 'GCB',
            'bank_account' => '123',
        ]);
        StaffAttendance::query()->create([
            'staff_id' => $staff->id,
            'date' => '2026-07-05',
            'status' => 'present',
        ]);

        $run = app(PayrollRunService::class)->execute([
            'run_name' => 'Clean Run',
            'pay_period_start' => '2026-07-01',
            'pay_period_end' => '2026-07-31',
            'payment_date' => '2026-07-28',
            'staff_ids' => [$staff->id],
        ], $officer);

        $head = $this->userWithRole('headteacher');
        Sanctum::actingAs($head);
        $this->postJson("/api/payroll-runs/{$run->id}/approve")->assertOk();

        Sanctum::actingAs($officer);
        $this->postJson('/api/payrolls/'.$run->payrolls()->first()->id.'/exclude')->assertStatus(422);
    }
}
