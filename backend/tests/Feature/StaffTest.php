<?php

namespace Tests\Feature;

use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffTest extends TestCase
{
    use RefreshDatabase;

    public function test_hr_can_create_staff(): void
    {
        $this->actingAsRole('hr_officer');

        $this->postJson('/api/staff', [
            'employee_id' => 'EMP-2001',
            'first_name' => 'Ama',
            'last_name' => 'Mensah',
            'department' => 'JHS',
            'salary' => 3000,
            'status' => 'active',
        ])->assertCreated()
            ->assertJsonPath('employee_id', 'EMP-2001');
    }

    public function test_new_staff_gets_a_unique_generated_employee_id(): void
    {
        $this->actingAsRole('hr_officer');

        $year = now()->year;

        $this->postJson('/api/staff', [
            'first_name' => 'Kofi',
            'last_name' => 'Boateng',
            'salary' => 2500,
        ])->assertCreated()
            ->assertJsonPath('employee_id', "SMS-{$year}-0001");

        $this->postJson('/api/staff', [
            'first_name' => 'Ama',
            'last_name' => 'Owusu',
            'salary' => 2800,
        ])->assertCreated()
            ->assertJsonPath('employee_id', "SMS-{$year}-0002");
    }

    public function test_new_staff_with_email_gets_a_portal_login(): void
    {
        $this->actingAsRole('hr_officer');

        $response = $this->postJson('/api/staff', [
            'first_name' => 'Ama',
            'last_name' => 'Owusu',
            'email' => 'ama.owusu@school.gh',
            'phone' => '0242000000',
            'salary' => 2800,
            'portal_role' => 'teacher',
        ])->assertCreated();

        $id = $response->json('employee_id');
        $this->assertNotEmpty($id);
        $this->assertDatabaseHas('users', [
            'email' => 'ama.owusu@school.gh',
        ]);

        $this->postJson('/api/auth/login/staff', [
            'employee_id' => $id,
            'email' => 'ama.owusu@school.gh',
        ])->assertOk()
            ->assertJsonPath('user.role.slug', 'teacher')
            ->assertJsonPath('user.employee_id', $id);
    }

    public function test_duplicate_submitted_id_is_replaced_with_a_unique_id(): void
    {
        $this->actingAsRole('hr_officer');
        $year = now()->year;

        Staff::query()->create([
            'employee_id' => "SMS-{$year}-0001",
            'first_name' => 'Existing',
            'last_name' => 'Staff',
            'salary' => 2000,
            'status' => 'active',
        ]);

        $this->postJson('/api/staff', [
            'employee_id' => "SMS-{$year}-0001",
            'first_name' => 'Yaw',
            'last_name' => 'Asante',
            'salary' => 2500,
        ])->assertCreated()
            ->assertJsonPath('employee_id', "SMS-{$year}-0002");
    }

    public function test_staff_can_be_deactivated_not_deleted(): void
    {
        $this->actingAsRole('hr_officer');
        $staff = Staff::query()->create([
            'employee_id' => 'EMP-2002',
            'salary' => 2000,
            'status' => 'active',
        ]);

        $this->postJson("/api/staff/{$staff->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('status', 'inactive');

        $this->assertDatabaseHas('staff', ['id' => $staff->id, 'status' => 'inactive']);
    }
}
