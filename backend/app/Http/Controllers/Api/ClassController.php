<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Staff;
use App\Models\Subject;
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
            ->with([
                'user.role',
                'classes:id,name,level,teacher_id,sort_order',
                'subjects:id,name,code,levels,sort_order',
            ])
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

    public function jhsSubjects(): JsonResponse
    {
        $rooms = SchoolClass::query()
            ->where('level', 'Junior High')
            ->withCount('students')
            ->orderBy('sort_order')
            ->get(['id', 'name', 'level', 'capacity', 'sort_order']);

        $subjects = Subject::query()
            ->with(['teachers.user.role', 'teachers.subjects:id,name,code', 'teachers.classes:id,name,level,teacher_id,sort_order'])
            ->orderBy('sort_order')
            ->get()
            ->filter(fn (Subject $subject) => $subject->offeredIn('Junior High'))
            ->map(fn (Subject $subject) => $this->serializeJhsSubject($subject, $rooms))
            ->values();

        return response()->json([
            'classes' => $rooms->map(fn (SchoolClass $class) => [
                'id' => $class->id,
                'name' => $class->name,
                'level' => $class->level,
                'capacity' => $class->capacity,
                'students_count' => (int) ($class->students_count ?? 0),
            ])->values(),
            'subjects' => $subjects,
        ]);
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
        if ($schoolClass->isJuniorHigh()) {
            throw ValidationException::withMessages([
                'teacher_id' => ['JHS teachers are assigned by subject. They take JHS 1, 2 and 3 together.'],
            ]);
        }

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

    public function assignJhsSubject(Request $request, Subject $subject): JsonResponse
    {
        if (! $subject->offeredIn('Junior High')) {
            throw ValidationException::withMessages([
                'subject_id' => ['Only Junior High subjects can be assigned this way.'],
            ]);
        }

        $data = $request->validate([
            'teacher_id' => ['nullable', 'exists:staff,id'],
        ]);

        $teacherId = $data['teacher_id'] ?? null;
        if ($teacherId) {
            $this->assertAssignableTeacher((int) $teacherId);
        }

        $previous = $subject->teachers()->first();
        $subject->teachers()->sync($teacherId ? [$teacherId] : []);

        Auditor::log('class.subject_assigned', $subject, [
            'previous_teacher_id' => $previous?->id,
            'teacher_id' => $teacherId,
            'subject' => $subject->name,
            'code' => $subject->code,
            'covers' => ['JHS 1', 'JHS 2', 'JHS 3'],
        ], $request->user(), $request);

        $rooms = SchoolClass::query()
            ->where('level', 'Junior High')
            ->withCount('students')
            ->orderBy('sort_order')
            ->get(['id', 'name', 'level', 'capacity', 'sort_order']);

        $subject->load(['teachers.user.role', 'teachers.subjects:id,name,code', 'teachers.classes:id,name,level,teacher_id,sort_order']);

        return response()->json($this->serializeJhsSubject($subject, $rooms));
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
                'teacher_id' => ['Only teaching staff can be assigned.'],
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
            'assignment_mode' => $class->isJuniorHigh() ? 'subject' : 'classroom',
            'students_count' => (int) ($class->students_count ?? 0),
            'teacher_id' => $class->usesClassTutor() ? $class->teacher_id : null,
            'teacher' => ($class->usesClassTutor() && $class->teacher) ? $this->serializeTeacher($class->teacher) : null,
        ];
    }

    protected function serializeJhsSubject(Subject $subject, $rooms): array
    {
        $teacher = $subject->teachers->first();

        return [
            'id' => $subject->id,
            'name' => $subject->name,
            'code' => $subject->code,
            'covers' => $rooms->pluck('name')->values()->all(),
            'teacher_id' => $teacher?->id,
            'teacher' => $teacher ? $this->serializeTeacher($teacher) : null,
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

        $subjects = $staff->relationLoaded('subjects')
            ? $staff->subjects->sortBy('sort_order')->values()->map(fn (Subject $subject) => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
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
            'subjects_count' => $subjects !== null ? count($subjects) : $staff->subjects()->count(),
            'subjects' => $subjects,
        ];
    }
}
