<?php

namespace Tests\Feature;

use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LeaveRequestTest extends TestCase
{
    use RefreshDatabase;

    protected function teacherWithStaff(): array
    {
        $user = $this->userWithRole('teacher');
        $staff = Staff::query()->create([
            'user_id' => $user->id,
            'employee_id' => 'SMS-2026-0101',
            'first_name' => 'Ama',
            'last_name' => 'Mensah',
            'department' => 'Lower Primary',
            'job_title' => 'Class Teacher',
            'salary' => 2500,
            'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        return [$user, $staff];
    }

    public function test_leave_types_include_entitlements_and_balances(): void
    {
        [, $staff] = $this->teacherWithStaff();

        $this->getJson('/api/leave-types')
            ->assertOk()
            ->assertJsonPath('staff.id', $staff->id)
            ->assertJsonPath('staff.employee_id', 'SMS-2026-0101')
            ->assertJsonFragment(['code' => 'annual', 'entitlement' => 28, 'max_per_request' => 28])
            ->assertJsonFragment(['code' => 'casual', 'entitlement' => 7, 'max_per_request' => 3])
            ->assertJsonFragment(['code' => 'maternity', 'entitlement' => 84]);
    }

    public function test_staff_can_request_leave_within_the_type_limit(): void
    {
        [, $staff] = $this->teacherWithStaff();

        $this->postJson('/api/leave-requests', [
            'leave_type' => 'casual',
            'start_date' => '2026-08-24',
            'end_date' => '2026-08-26',
            'reason' => 'Personal errand at the district office',
            'handover_to' => 'Yaw Asante',
        ])->assertCreated()
            ->assertJsonPath('staff_id', $staff->id)
            ->assertJsonPath('leave_type', 'casual')
            ->assertJsonPath('days_requested', 3)
            ->assertJsonPath('status', 'pending_hr');
    }

    public function test_casual_leave_cannot_exceed_three_days(): void
    {
        $this->teacherWithStaff();

        $this->postJson('/api/leave-requests', [
            'leave_type' => 'casual',
            'start_date' => '2026-08-24',
            'end_date' => '2026-08-27',
            'reason' => 'Family matter',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);
    }

    public function test_sick_leave_requires_a_reason(): void
    {
        $this->teacherWithStaff();

        $this->postJson('/api/leave-requests', [
            'leave_type' => 'sick',
            'start_date' => '2026-08-24',
            'end_date' => '2026-08-25',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    public function test_teacher_cannot_request_leave_for_another_staff_member(): void
    {
        $this->teacherWithStaff();
        $other = Staff::query()->create([
            'employee_id' => 'SMS-2026-0102',
            'first_name' => 'Kojo',
            'last_name' => 'Ampofo',
            'salary' => 2500,
            'status' => 'active',
        ]);

        $this->postJson('/api/leave-requests', [
            'staff_id' => $other->id,
            'leave_type' => 'annual',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-02',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['staff_id']);
    }

    public function test_yearly_balance_is_enforced(): void
    {
        [, $staff] = $this->teacherWithStaff();
        $this->postJson('/api/leave-requests', [
            'leave_type' => 'paternity',
            'start_date' => '2026-08-24',
            'end_date' => '2026-08-28',
        ])->assertCreated()
            ->assertJsonPath('days_requested', 5);

        $this->postJson('/api/leave-requests', [
            'leave_type' => 'paternity',
            'start_date' => '2026-09-07',
            'end_date' => '2026-09-07',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['leave_type']);

        $this->getJson('/api/leave-types')
            ->assertOk()
            ->assertJsonFragment([
                'code' => 'paternity',
                'used' => 5,
                'remaining' => 0,
            ]);

        $this->assertDatabaseHas('leave_requests', [
            'staff_id' => $staff->id,
            'leave_type' => 'paternity',
            'days_requested' => 5,
        ]);
    }
}
