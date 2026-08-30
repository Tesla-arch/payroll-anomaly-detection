<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_officer_can_login_with_email_and_password(): void
    {
        $this->userWithRole('headteacher', [
            'email' => 'head@school.gh',
            'password' => 'password',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'HEAD@school.gh',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('user.role.slug', 'headteacher')
            ->assertJsonStructure(['token', 'user' => ['email', 'role']]);
    }

    public function test_teacher_cannot_use_officer_email_login(): void
    {
        $this->staffWithPortal('teacher', [
            'email' => 'teacher@school.gh',
            'password' => 'password',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'teacher@school.gh',
            'password' => 'password',
        ])->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Teachers and accountants sign in with their staff ID and the email on their employment file.');
    }

    public function test_staff_login_with_employee_id_and_email(): void
    {
        [, $staff] = $this->staffWithPortal('accountant', [
            'email' => 'accounts@school.gh',
            'password' => 'password',
        ], [
            'employee_id' => 'EMP-ACC-01',
            'email' => 'accounts@school.gh',
        ]);

        $this->postJson('/api/auth/login/staff', [
            'employee_id' => 'emp-acc-01',
            'email' => 'ACCOUNTS@school.gh',
        ])->assertOk()
            ->assertJsonPath('user.email', 'accounts@school.gh')
            ->assertJsonPath('user.employee_id', $staff->employee_id)
            ->assertJsonPath('user.role.slug', 'accountant');
    }

    public function test_staff_login_rejects_mismatched_email(): void
    {
        $this->staffWithPortal('teacher', [
            'email' => 'teacher@school.gh',
            'password' => 'password',
        ], [
            'employee_id' => 'EMP-1001',
            'email' => 'teacher@school.gh',
        ]);

        $this->postJson('/api/auth/login/staff', [
            'employee_id' => 'EMP-1001',
            'email' => 'other@school.gh',
        ])->assertStatus(422);
    }

    public function test_headteacher_cannot_use_staff_id_login(): void
    {
        $this->staffWithPortal('headteacher', [
            'email' => 'head@school.gh',
            'password' => 'password',
        ], [
            'employee_id' => 'EMP-HEAD-01',
            'email' => 'head@school.gh',
        ]);

        $this->postJson('/api/auth/login/staff', [
            'employee_id' => 'EMP-HEAD-01',
            'email' => 'head@school.gh',
        ])->assertStatus(422);
    }

    public function test_officers_can_self_register(): void
    {
        $this->seedRoles();

        $this->postJson('/api/auth/register', $this->officerRegistration())
            ->assertCreated()
            ->assertJsonPath('user.role.slug', 'hr_officer')
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_registration_requires_a_valid_captcha(): void
    {
        $this->seedRoles();

        $this->postJson('/api/auth/register', $this->officerRegistration([
            'captcha' => 'WRONG',
        ]))->assertStatus(422)
            ->assertJsonValidationErrors('captcha');
    }

    public function test_captcha_challenge_is_single_use(): void
    {
        $this->seedRoles();
        $payload = $this->officerRegistration();

        $this->postJson('/api/auth/register', $payload)->assertCreated();
        $this->postJson('/api/auth/register', array_merge($payload, [
            'email' => 'second@school.gh',
        ]))->assertStatus(422)
            ->assertJsonValidationErrors('captcha');
    }

    public function test_captcha_endpoint_returns_an_image_challenge(): void
    {
        $this->getJson('/api/auth/captcha')
            ->assertOk()
            ->assertJsonStructure(['id', 'svg', 'expires_in']);
    }

    public function test_teachers_cannot_self_register(): void
    {
        $this->seedRoles();

        $this->postJson('/api/auth/register', $this->officerRegistration([
            'email' => 'ama@school.gh',
            'role' => 'teacher',
        ]))->assertStatus(422);
    }

    public function test_register_roles_lists_officer_desks_only(): void
    {
        $this->seedRoles();

        $this->getJson('/api/auth/register-roles')
            ->assertOk()
            ->assertJsonCount(4)
            ->assertJsonFragment(['slug' => 'headteacher'])
            ->assertJsonMissing(['slug' => 'teacher']);
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        $this->userWithRole('hr_officer', ['email' => 'hr@school.gh']);

        $this->postJson('/api/auth/login', [
            'email' => 'hr@school.gh',
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
