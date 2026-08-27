<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserDeskTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_list_and_filter_users(): void
    {
        $admin = $this->actingAsRole('super_admin');
        $this->userWithRole('teacher', ['first_name' => 'Ama', 'last_name' => 'Mensah', 'email' => 'ama@school.gh']);

        $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/users?role=teacher')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'ama@school.gh');

        $this->getJson('/api/users/summary')
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonFragment(['slug' => 'teacher', 'total' => 1]);
    }

    public function test_teacher_cannot_open_the_users_desk(): void
    {
        $this->actingAsRole('teacher');

        $this->getJson('/api/users')->assertForbidden();
        $this->getJson('/api/users/summary')->assertForbidden();
        $this->postJson('/api/users', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@school.gh',
            'password' => 'password',
            'role_id' => 1,
        ])->assertForbidden();
    }

    public function test_super_admin_can_create_a_user(): void
    {
        $this->actingAsRole('super_admin');
        $roles = $this->seedRoles();

        $this->postJson('/api/users', [
            'first_name' => 'Kwesi',
            'last_name' => 'Boateng',
            'email' => 'kwesi@school.gh',
            'phone' => '0241111111',
            'password' => 'password',
            'role_id' => $roles['payroll_officer']->id,
        ])
            ->assertCreated()
            ->assertJsonPath('email', 'kwesi@school.gh')
            ->assertJsonPath('role.slug', 'payroll_officer');
    }

    public function test_super_admin_cannot_deactivate_own_account(): void
    {
        $admin = $this->actingAsRole('super_admin');

        $this->putJson('/api/users/'.$admin->id, ['status' => 'inactive'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }
}
