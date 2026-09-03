<?php

namespace Tests\Feature;

use App\Models\SchoolClass;
use App\Models\Student;
use Database\Seeders\ClassRollSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassRollSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_fills_each_class_to_twenty_five_pupils(): void
    {
        $this->actingAsRole('hr_officer');
        SchoolClass::syncCatalogue();

        $grade1 = SchoolClass::query()->where('name', 'Grade 1')->firstOrFail();
        Student::query()->create([
            'admission_number' => 'ADM-2026-0001',
            'first_name' => 'Ama',
            'last_name' => 'Mensah',
            'gender' => 'female',
            'class_id' => $grade1->id,
            'status' => 'active',
        ]);

        $this->seed(ClassRollSeeder::class);

        $this->assertSame(9, SchoolClass::query()->count());
        SchoolClass::query()->orderBy('sort_order')->each(function (SchoolClass $class) {
            $this->assertSame(
                ClassRollSeeder::PER_CLASS,
                $class->students()->count(),
                $class->name.' should have '.ClassRollSeeder::PER_CLASS.' pupils'
            );
        });

        $this->getJson('/api/students?class_id='.$grade1->id.'&per_page=40')
            ->assertOk()
            ->assertJsonPath('total', 25);
    }
}
