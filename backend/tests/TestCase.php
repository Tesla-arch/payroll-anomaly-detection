<?php

namespace Tests;

use App\Models\Role;
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
}
