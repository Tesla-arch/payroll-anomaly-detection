<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_and_receive_a_token(): void
    {
        $user = $this->userWithRole('payroll_officer', [
            'email' => 'payroll@school.gh',
            'password' => 'password',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'payroll@school.gh',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user' => ['email', 'role']]);
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        $this->userWithRole('teacher', ['email' => 'teacher@school.gh']);

        $this->postJson('/api/auth/login', [
            'email' => 'teacher@school.gh',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    public function test_rbac_blocks_teacher_from_creating_staff(): void
    {
        $this->actingAsRole('teacher');

        $this->postJson('/api/staff', [
            'employee_id' => 'EMP-X',
            'salary' => 1000,
        ])->assertForbidden();
    }

    public function test_hr_can_access_staff_index(): void
    {
        $this->actingAsRole('hr_officer');

        $this->getJson('/api/staff')->assertOk();
    }

    public function test_authenticated_user_can_fetch_profile(): void
    {
        $this->actingAsRole('headteacher');

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.role.slug', 'headteacher');
    }
}
