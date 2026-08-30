<?php

namespace Tests\Feature;

use App\Models\SchoolClass;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_headteacher_can_assign_and_clear_a_class_teacher(): void
    {
        $this->actingAsRole('headteacher');
        [, $teacher] = $this->staffWithPortal('teacher', [
            'first_name' => 'Ama',
            'last_name' => 'Owusu',
        ], [
            'job_title' => 'Class Teacher',
        ]);

        $class = $this->classroom();

        $this->putJson("/api/classes/{$class->id}/teacher", [
            'teacher_id' => $teacher->id,
        ])->assertOk()
            ->assertJsonPath('id', $class->id)
            ->assertJsonPath('teacher_id', $teacher->id)
            ->assertJsonPath('teacher.display_name', $teacher->display_name);

        $this->assertDatabaseHas('school_classes', [
            'id' => $class->id,
            'teacher_id' => $teacher->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'class.teacher_assigned',
            'auditable_id' => $class->id,
        ]);

        $this->putJson("/api/classes/{$class->id}/teacher", [
            'teacher_id' => null,
        ])->assertOk()
            ->assertJsonPath('teacher_id', null)
            ->assertJsonPath('teacher', null);
    }

    public function test_hr_can_list_assignable_teachers(): void
    {
        $this->actingAsRole('hr_officer');
        [, $teacher] = $this->staffWithPortal('teacher', [
            'first_name' => 'Kofi',
            'last_name' => 'Mensah',
        ], [
            'job_title' => 'JHS Tutor',
        ]);
        [, $accountant] = $this->staffWithPortal('accountant');

        $class = $this->classroom();
        $class->update(['teacher_id' => $teacher->id]);

        $ids = collect($this->getJson('/api/classes/teachers')->assertOk()->json())->pluck('id');
        $this->assertTrue($ids->contains($teacher->id));
        $this->assertFalse($ids->contains($accountant->id));
        $this->getJson('/api/classes/teachers')
            ->assertJsonFragment(['id' => $teacher->id, 'classes_count' => 1]);
    }

    public function test_cannot_assign_non_teaching_or_inactive_staff(): void
    {
        $this->actingAsRole('hr_officer');
        [, $accountant] = $this->staffWithPortal('accountant', [], [
            'job_title' => 'Accountant',
        ]);
        [, $inactive] = $this->staffWithPortal('teacher', [
            'first_name' => 'Yaw',
            'last_name' => 'Asante',
        ], [
            'job_title' => 'Teacher',
            'status' => 'inactive',
        ]);

        $class = $this->classroom();

        $this->putJson("/api/classes/{$class->id}/teacher", [
            'teacher_id' => $accountant->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['teacher_id']);

        $this->putJson("/api/classes/{$class->id}/teacher", [
            'teacher_id' => $inactive->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['teacher_id']);
    }

    public function test_teachers_cannot_assign_class_tutors(): void
    {
        $this->actingAsRole('teacher');
        [, $teacher] = $this->staffWithPortal('teacher');
        $class = $this->classroom();

        $this->putJson("/api/classes/{$class->id}/teacher", [
            'teacher_id' => $teacher->id,
        ])->assertForbidden();

        $this->getJson('/api/classes/teachers')->assertForbidden();
    }

    public function test_class_list_includes_current_tutor(): void
    {
        $this->actingAsRole('headteacher');
        [, $teacher] = $this->staffWithPortal('teacher', [
            'first_name' => 'Abena',
            'last_name' => 'Sarpong',
        ]);
        $class = $this->classroom();
        $class->update(['teacher_id' => $teacher->id]);

        $this->getJson('/api/classes')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $class->id,
                'name' => 'Grade 1',
                'teacher_id' => $teacher->id,
            ]);
    }

    public function test_jhs_teachers_are_assigned_by_subject_not_classroom(): void
    {
        $this->actingAsRole('headteacher');
        [, $teacher] = $this->staffWithPortal('teacher', [
            'first_name' => 'Kojo',
            'last_name' => 'Ampofo',
        ], [
            'job_title' => 'JHS Teacher',
        ]);

        SchoolClass::syncCatalogue();
        Subject::syncCatalogue();
        $jhs = SchoolClass::query()->where('name', 'JHS 1')->firstOrFail();
        $maths = Subject::query()->where('code', 'MAT')->firstOrFail();

        $this->putJson("/api/classes/{$jhs->id}/teacher", [
            'teacher_id' => $teacher->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['teacher_id']);

        $this->putJson("/api/classes/jhs-subjects/{$maths->id}/teacher", [
            'teacher_id' => $teacher->id,
        ])->assertOk()
            ->assertJsonPath('teacher_id', $teacher->id)
            ->assertJsonPath('name', 'Mathematics')
            ->assertJsonPath('covers', ['JHS 1', 'JHS 2', 'JHS 3']);

        $this->assertDatabaseHas('staff_subject', [
            'staff_id' => $teacher->id,
            'subject_id' => $maths->id,
        ]);
        $this->assertDatabaseHas('school_classes', [
            'id' => $jhs->id,
            'teacher_id' => null,
        ]);
    }

    public function test_jhs_subject_teacher_sees_all_three_rooms(): void
    {
        SchoolClass::syncCatalogue();
        Subject::syncCatalogue();
        [$user, $teacher] = $this->staffWithPortal('teacher');
        $teacher->subjects()->sync([
            Subject::query()->where('code', 'MAT')->value('id'),
        ]);
        \Laravel\Sanctum\Sanctum::actingAs($user);

        $names = collect($this->getJson('/api/my-class')->assertOk()->json('classes'))->pluck('name')->all();
        $this->assertEqualsCanonicalizing(['JHS 1', 'JHS 2', 'JHS 3'], $names);
    }

    public function test_primary_class_teacher_does_not_receive_jhs_rooms(): void
    {
        SchoolClass::syncCatalogue();
        Subject::syncCatalogue();
        [$user, $teacher] = $this->staffWithPortal('teacher');
        $grade = SchoolClass::query()->where('name', 'Grade 1')->firstOrFail();
        $grade->update(['teacher_id' => $teacher->id]);
        \Laravel\Sanctum\Sanctum::actingAs($user);

        $names = collect($this->getJson('/api/my-class')->assertOk()->json('classes'))->pluck('name')->all();
        $this->assertSame(['Grade 1'], $names);
    }

    protected function classroom(): SchoolClass
    {
        SchoolClass::syncCatalogue();

        return SchoolClass::query()->where('name', 'Grade 1')->firstOrFail();
    }
}
