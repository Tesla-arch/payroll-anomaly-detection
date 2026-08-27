<?php

namespace Tests\Feature;

use App\Support\Auditor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditTrailTest extends TestCase
{
    use RefreshDatabase;

    public function test_auditor_can_open_the_audit_trail(): void
    {
        $user = $this->actingAsRole('auditor');
        Auditor::log('staff.updated', $user, ['field' => 'department'], $user);

        $this->getJson('/api/audit-logs')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'staff.updated')
            ->assertJsonPath('data.0.module', 'staff')
            ->assertJsonPath('data.0.user.id', $user->id);
    }

    public function test_teacher_cannot_open_the_audit_trail(): void
    {
        $this->actingAsRole('teacher');

        $this->getJson('/api/audit-logs')->assertForbidden();
        $this->getJson('/api/audit-logs/summary')->assertForbidden();
    }

    public function test_module_filter_and_summary_group_payroll_events(): void
    {
        $user = $this->actingAsRole('auditor');
        Auditor::log('auth.login', $user, [], $user);
        Auditor::log('payroll_run.approved', null, ['staff_count' => 11], $user);
        Auditor::log('payroll.excluded', null, ['payroll_run_id' => 4], $user);

        $this->getJson('/api/audit-logs?module=payroll')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/audit-logs/summary')
            ->assertOk()
            ->assertJsonPath('total', 3)
            ->assertJsonFragment(['module' => 'payroll', 'total' => 2])
            ->assertJsonPath('sensitive', 2);

        $this->getJson('/api/audit-logs?sensitive=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.is_sensitive', true);
    }

    public function test_search_matches_actor_name(): void
    {
        $user = $this->actingAsRole('headteacher', [
            'first_name' => 'Kwame',
            'last_name' => 'Boateng',
        ]);
        Auditor::log('leave.approve', $user, [], $user);

        $this->getJson('/api/audit-logs?search=Kwame')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', 'leave.approve');
    }
}
