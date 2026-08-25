<?php

namespace Tests\Feature;

use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportOverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_payroll_roles_can_open_the_reports_overview(): void
    {
        $this->actingAsRole('accountant');

        $this->getJson('/api/reports/overview')
            ->assertOk()
            ->assertJsonStructure([
                'payroll' => ['runs', 'totals'],
                'anomalies' => ['open', 'critical_open', 'byRule', 'bySeverity', 'byStatus', 'openByRule'],
                'school' => ['active_staff', 'students', 'by_department', 'attendance_today'],
            ]);
    }

    public function test_teacher_cannot_open_reports(): void
    {
        $this->actingAsRole('teacher');

        $this->getJson('/api/reports/overview')->assertForbidden();
    }

    public function test_overview_groups_staff_even_when_names_are_missing(): void
    {
        $this->actingAsRole('accountant');

        Staff::query()->create([
            'employee_id' => 'SMS-2026-9999',
            'department' => 'Lower Primary',
            'status' => 'active',
            'salary' => 0,
        ]);

        $this->getJson('/api/reports/overview')
            ->assertOk()
            ->assertJsonPath('school.active_staff', 1)
            ->assertJsonFragment(['department' => 'Lower Primary', 'total' => 1]);
    }
}
