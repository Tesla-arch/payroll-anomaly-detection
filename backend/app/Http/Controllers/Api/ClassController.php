<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Staff;
use App\Support\Auditor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ClassController extends Controller
{
    public function index(): JsonResponse
    {
        $classes = SchoolClass::query()
            ->with(['teacher.user.role'])
            ->withCount('students')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (SchoolClass $class) => $this->serializeClass($class));

        return response()->json($classes);
    }

    public function teachers(): JsonResponse
    {
        $teachers = Staff::query()
            ->with(['user.role', 'classes:id,name,level,teacher_id,sort_order'])
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereHas('user.role', fn ($role) => $role->where('slug', 'teacher'))
                    ->orWhere('job_title', 'like', '%Teacher%')
                    ->orWhere('job_title', 'like', '%Tutor%');
            })
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Staff $staff) => $this->serializeTeacher($staff));

        return response()->json($teachers);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'level' => ['nullable', 'string', 'max:50'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'teacher_id' => ['nullable', 'exists:staff,id'],
        ]);

        if (! empty($data['teacher_id'])) {
            $this->assertAssignableTeacher((int) $data['teacher_id']);
        }

        $class = SchoolClass::query()->create($data);

        return response()->json(
            $this->serializeClass($class->load(['teacher.user.role'])->loadCount('students')),
            201,
        );
    }

    public function assignTeacher(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $data = $request->validate([
            'teacher_id' => ['nullable', 'exists:staff,id'],
        ]);

        $teacherId = $data['teacher_id'] ?? null;
        if ($teacherId) {
            $this->assertAssignableTeacher((int) $teacherId);
        }

        $previousId = $schoolClass->teacher_id;
        $schoolClass->update(['teacher_id' => $teacherId]);

        Auditor::log('class.teacher_assigned', $schoolClass, [
            'previous_teacher_id' => $previousId,
            'teacher_id' => $teacherId,
            'class_name' => $schoolClass->name,
            'level' => $schoolClass->level,
        ], $request->user(), $request);

        return response()->json(
            $this->serializeClass($schoolClass->fresh()->load(['teacher.user.role'])->loadCount('students'))
        );
    }

    protected function assertAssignableTeacher(int $teacherId): void
    {
        $staff = Staff::query()->with('user.role')->find($teacherId);
        if (! $staff || $staff->status !== 'active') {
            throw ValidationException::withMessages([
                'teacher_id' => ['Choose an active teacher from the staff register.'],
            ]);
        }

        $isTeacher = $staff->user?->role?->slug === 'teacher'
            || str_contains(strtolower((string) $staff->job_title), 'teacher')
            || str_contains(strtolower((string) $staff->job_title), 'tutor');

        if (! $isTeacher) {
            throw ValidationException::withMessages([
                'teacher_id' => ['Only teaching staff can be assigned as class tutors.'],
            ]);
        }
    }

    protected function serializeClass(SchoolClass $class): array
    {
        return [
            'id' => $class->id,
            'name' => $class->name,
            'level' => $class->level,
            'capacity' => $class->capacity,
            'sort_order' => $class->sort_order,
            'students_count' => (int) ($class->students_count ?? 0),
            'teacher_id' => $class->teacher_id,
            'teacher' => $class->teacher ? $this->serializeTeacher($class->teacher) : null,
        ];
    }

    protected function serializeTeacher(Staff $staff): array
    {
        $classes = $staff->relationLoaded('classes')
            ? $staff->classes->sortBy('sort_order')->values()->map(fn (SchoolClass $class) => [
                'id' => $class->id,
                'name' => $class->name,
                'level' => $class->level,
            ])->all()
            : null;

        return [
            'id' => $staff->id,
            'employee_id' => $staff->employee_id,
            'display_name' => $staff->display_name,
            'first_name' => $staff->first_name,
            'last_name' => $staff->last_name,
            'job_title' => $staff->job_title,
            'department' => $staff->department,
            'email' => $staff->email ?: $staff->user?->email,
            'status' => $staff->status,
            'classes_count' => $classes !== null ? count($classes) : $staff->classes()->count(),
            'classes' => $classes,
        ];
    }
}
