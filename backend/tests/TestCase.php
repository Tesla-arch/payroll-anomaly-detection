<?php

namespace Tests;

use App\Models\Role;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /**
     * @return array<string, Role>
     */
    protected function seedRoles(): array
    {
        $items = [
            'super_admin' => 'Super Admin',
            'headteacher' => 'Headteacher',
            'hr_officer' => 'HR Officer',
            'payroll_officer' => 'Payroll Officer',
            'accountant' => 'Accountant',
            'teacher' => 'Teacher',
            'auditor' => 'Auditor',
            'parent' => 'Parent',
        ];

        $roles = [];
        foreach ($items as $slug => $name) {
            $roles[$slug] = Role::query()->firstOrCreate(['slug' => $slug], ['name' => $name]);
        }

        return $roles;
    }

    protected function userWithRole(string $slug, array $overrides = []): User
    {
        $roles = $this->seedRoles();

        return User::factory()->create(array_merge([
            'role_id' => $roles[$slug]->id,
        ], $overrides));
    }

    protected function actingAsRole(string $slug, array $overrides = []): User
    {
        $user = $this->userWithRole($slug, $overrides);
        Sanctum::actingAs($user);

        return $user;
    }

    /**
     * @return array{0: User, 1: Staff}
     */
    protected function staffWithPortal(string $slug, array $userOverrides = [], array $staffOverrides = []): array
    {
        $user = $this->userWithRole($slug, $userOverrides);
        $staff = Staff::query()->create(array_merge([
            'user_id' => $user->id,
            'employee_id' => 'EMP-'.$user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'salary' => 2500,
            'status' => 'active',
        ], $staffOverrides));

        return [$user, $staff];
    }
}
