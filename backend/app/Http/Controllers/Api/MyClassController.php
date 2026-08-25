<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentAttendance;
use App\Services\AssessmentGrading;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class MyClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $classes = $this->taughtClasses($request)->withCount(['students' => fn ($query) => $query->where('status', 'active')])->get();

        return response()->json([
            'staff_id' => $request->user()->staff?->id,
            'classes' => $classes->map(fn (SchoolClass $class) => $this->classSummary($class)),
        ]);
    }

    public function show(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->assertOwns($request, $schoolClass);
        $date = $request->filled('date') ? $request->date('date') : now();
        $year = $request->string('academic_year')->toString() ?: AssessmentGrading::currentAcademicYear();
        $term = (int) ($request->integer('term') ?: AssessmentGrading::currentTerm());

        $pupils = $schoolClass->students()
            ->where('status', 'active')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $attendance = StudentAttendance::query()
            ->whereIn('student_id', $pupils->pluck('id'))
            ->whereDate('date', $date)
            ->get()
            ->keyBy('student_id');

        $averages = $this->termAverages($pupils->pluck('id'), $year, $term);
        $schoolClass->loadCount(['students' => fn ($query) => $query->where('status', 'active')]);

        return response()->json([
            'class' => $this->classSummary($schoolClass),
            'date' => $date->toDateString(),
            'academic_year' => $year,
            'term' => $term,
            'can_edit' => true,
            'summary' => [
                'roll' => $pupils->count(),
                'present' => $attendance->whereIn('status', ['present', 'late'])->count(),
                'absent' => $attendance->where('status', 'absent')->count(),
                'late' => $attendance->where('status', 'late')->count(),
                'excused' => $attendance->where('status', 'excused')->count(),
                'unmarked' => $pupils->count() - $attendance->count(),
            ],
            'pupils' => $pupils->map(function (Student $student) use ($attendance, $averages) {
                $row = $attendance->get($student->id);

                return [
                    'id' => $student->id,
                    'admission_number' => $student->admission_number,
                    'display_name' => $student->display_name,
                    'gender' => $student->gender,
                    'guardian_name' => $student->guardian_name,
                    'guardian_phone' => $student->guardian_phone ?: $student->phone_number,
                    'attendance' => $row?->status,
                    'attendance_notes' => $row?->notes,
                    'term_average' => $averages[$student->id] ?? null,
                ];
            })->values(),
        ]);
    }

    public function saveAttendance(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->assertOwns($request, $schoolClass);

        $data = $request->validate([
            'date' => ['required', 'date'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'exists:students,id'],
            'records.*.status' => ['required', 'in:present,absent,late,excused'],
            'records.*.notes' => ['nullable', 'string', 'max:160'],
        ]);

        $allowed = $schoolClass->students()->pluck('id')->map(fn ($id) => (int) $id)->all();

        foreach ($data['records'] as $record) {
            abort_unless(in_array((int) $record['student_id'], $allowed, true), 422, 'A pupil is not in this class.');

            StudentAttendance::query()->updateOrCreate(
                [
                    'student_id' => $record['student_id'],
                    'date' => $data['date'],
                ],
                [
                    'class_id' => $schoolClass->id,
                    'status' => $record['status'],
                    'notes' => $record['notes'] ?? null,
                    'recorded_by' => $request->user()->id,
                ],
            );
        }

        $request->merge(['date' => $data['date']]);

        return $this->show($request, $schoolClass);
    }

    protected function taughtClasses(Request $request)
    {
        $user = $request->user()->loadMissing('staff');

        if ($user->isSuperAdmin()) {
            return SchoolClass::query()->orderBy('sort_order');
        }

        abort_unless($user->hasRole('teacher') && $user->staff, 403, 'You do not have a class teaching assignment.');

        return SchoolClass::query()->where('teacher_id', $user->staff->id)->orderBy('sort_order');
    }

    protected function assertOwns(Request $request, SchoolClass $class): void
    {
        $user = $request->user()->loadMissing('staff');
        if ($user->isSuperAdmin()) {
            return;
        }

        abort_unless(
            $user->hasRole('teacher') && $user->staff && (int) $class->teacher_id === (int) $user->staff->id,
            403,
            'This class is assigned to another tutor.',
        );
    }

    protected function classSummary(SchoolClass $class): array
    {
        return [
            'id' => $class->id,
            'name' => $class->name,
            'level' => $class->level,
            'capacity' => $class->capacity,
            'students_count' => $class->students_count ?? $class->students()->count(),
        ];
    }

    protected function termAverages(Collection $studentIds, string $year, int $term): array
    {
        if ($studentIds->isEmpty()) {
            return [];
        }

        $rows = StudentAssessment::query()
            ->whereIn('student_id', $studentIds)
            ->where('academic_year', $year)
            ->where('term', $term)
            ->get()
            ->groupBy('student_id');

        $averages = [];
        foreach ($rows as $studentId => $assessments) {
            $subjectAverages = $assessments->map(fn (StudentAssessment $row) => AssessmentGrading::average([
                'classwork' => $row->classwork,
                'project' => $row->project,
                'assignment' => $row->assignment,
                'homework' => $row->homework,
            ]))->filter(fn ($value) => $value !== null);

            $averages[$studentId] = $subjectAverages->count() ? round($subjectAverages->avg(), 1) : null;
        }

        return $averages;
    }
}
