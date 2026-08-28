<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Staff;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabasePersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_again_keeps_records_created_in_the_app(): void
    {
        $this->seed(DatabaseSeeder::class);

        $role = Role::query()->where('slug', 'hr_officer')->first();
        $this->assertNotNull($role);

        $user = User::query()->create([
            'role_id' => $role->id,
            'first_name' => 'Persisted',
            'last_name' => 'Officer',
            'email' => 'persisted.officer@school.gh',
            'phone' => '0200000000',
            'password' => 'password',
            'status' => 'active',
        ]);
        $users = User::query()->count();
        $staff = Staff::query()->count();
        $students = Student::query()->count();

        $this->seed(DatabaseSeeder::class);

        $this->assertTrue(User::query()->whereKey($user->id)->exists());
        $this->assertSame($users, User::query()->count());
        $this->assertSame($staff, Staff::query()->count());
        $this->assertSame($students, Student::query()->count());
    }
}
