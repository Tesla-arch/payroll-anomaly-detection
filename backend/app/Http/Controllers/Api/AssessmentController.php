<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentTermReport;
use App\Models\Subject;
use App\Services\AssessmentGrading;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AssessmentController extends Controller
{
    public function show(Request $request, Student $student): JsonResponse
    {
        $this->assertCanView($request, $student);

        return response()->json($this->dashboard($request, $student));
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $this->assertCanView($request, $student);
        abort_unless($student->userCanEditAssessments($request->user()), 403, 'Only the assigned teacher can enter assessment scores.');

        $data = $request->validate([
            'academic_year' => ['required', 'string', 'max:12'],
            'term' => ['required', 'integer', 'in:1,2,3'],
            'teacher_comment' => ['nullable', 'string', 'max:1000'],
            'scores' => ['required', 'array'],
            'scores.*.subject_id' => ['required', 'exists:subjects,id'],
            'scores.*.classwork' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'scores.*.project' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'scores.*.assignment' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'scores.*.homework' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'scores.*.remark' => ['nullable', 'string', 'max:120'],
        ]);

        foreach ($data['scores'] as $row) {
            if (! $student->userCanEditSubject($request->user(), (int) $row['subject_id'])) {
                continue;
            }

            StudentAssessment::query()->updateOrCreate(
                [
                    'student_id' => $student->id,
                    'subject_id' => $row['subject_id'],
                    'academic_year' => $data['academic_year'],
                    'term' => $data['term'],
                ],
                [
                    'classwork' => $row['classwork'] ?? null,
                    'project' => $row['project'] ?? null,
                    'assignment' => $row['assignment'] ?? null,
                    'homework' => $row['homework'] ?? null,
                    'remark' => $row['remark'] ?? null,
                    'recorded_by' => $request->user()->id,
                ],
            );
        }

        StudentTermReport::query()->updateOrCreate(
            [
                'student_id' => $student->id,
                'academic_year' => $data['academic_year'],
                'term' => $data['term'],
            ],
            [
                'teacher_comment' => $data['teacher_comment'] ?? null,
                'recorded_by' => $request->user()->id,
            ],
        );

        $request->merge([
            'academic_year' => $data['academic_year'],
            'term' => $data['term'],
        ]);

        return response()->json($this->dashboard($request, $student->fresh()));
    }

    public function pdf(Request $request, Student $student): Response
    {
        $this->assertCanView($request, $student);
        $payload = $this->dashboard($request, $student);
        $year = str_replace('/', '-', $payload['academic_year']);
        $pdf = Pdf::loadView('assessment-report', ['report' => $payload])->setPaper('a4');

        return $pdf->download('report-'.$student->admission_number.'-'.$year.'-T'.$payload['term'].'.pdf');
    }

    protected function assertCanView(Request $request, Student $student): void
    {
        abort_unless($student->userCanViewAssessments($request->user()), 403);
    }

    protected function dashboard(Request $request, Student $student): array
    {
        $student->load(['schoolClass.teacher.user', 'parent']);
        $year = $request->string('academic_year')->toString() ?: AssessmentGrading::currentAcademicYear();
        $term = (int) ($request->integer('term') ?: AssessmentGrading::currentTerm());
        if (! in_array($term, [1, 2, 3], true)) {
            $term = AssessmentGrading::currentTerm();
        }

        $level = $student->schoolClass?->level;
        $subjects = Subject::query()
            ->with(['teachers.user'])
            ->orderBy('sort_order')
            ->get()
            ->filter(fn (Subject $subject) => $subject->offeredIn($level));
        $rows = StudentAssessment::query()
            ->where('student_id', $student->id)
            ->where('academic_year', $year)
            ->where('term', $term)
            ->get()
            ->keyBy('subject_id');

        $items = $subjects->map(function (Subject $subject) use ($rows, $request, $student) {
            $row = $rows->get($subject->id);
            $scores = [
                'classwork' => $row?->classwork,
                'project' => $row?->project,
                'assignment' => $row?->assignment,
                'homework' => $row?->homework,
            ];
            $average = AssessmentGrading::average($scores);
            $grade = AssessmentGrading::grade($average);
            $subjectTeacher = $subject->relationLoaded('teachers')
                ? $subject->teachers->first()
                : $subject->teachers()->with('user')->first();

            return [
                'subject_id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
                ...$scores,
                'average' => $average,
                'grade' => $grade['grade'],
                'band' => $grade['remark'],
                'remark' => $row?->remark,
                'can_edit' => $student->userCanEditSubject($request->user(), $subject->id),
                'teacher' => $student->schoolClass?->isJuniorHigh()
                    ? ($subjectTeacher?->display_name)
                    : ($student->schoolClass?->teacher?->display_name),
            ];
        })->values();

        $averages = $items->pluck('average')->filter(fn ($value) => $value !== null);
        $overall = $averages->count() ? round($averages->avg(), 1) : null;
        $overallGrade = AssessmentGrading::grade($overall);

        $termAverages = collect([1, 2, 3])->map(function (int $item) use ($student, $year, $term, $overall) {
            if ($item === $term) {
                return ['term' => $item, 'average' => $overall];
            }

            return ['term' => $item, 'average' => $this->termAverage($student, $year, $item)];
        });

        $report = StudentTermReport::query()
            ->where('student_id', $student->id)
            ->where('academic_year', $year)
            ->where('term', $term)
            ->first();

        $years = StudentAssessment::query()
            ->where('student_id', $student->id)
            ->distinct()
            ->orderByDesc('academic_year')
            ->pluck('academic_year')
            ->all();
        if (! in_array($year, $years, true)) {
            array_unshift($years, $year);
        }
        $current = AssessmentGrading::currentAcademicYear();
        if (! in_array($current, $years, true)) {
            $years[] = $current;
        }

        return [
            'student' => [
                'id' => $student->id,
                'display_name' => $student->display_name,
                'admission_number' => $student->admission_number,
                'gender' => $student->gender,
                'class' => $student->schoolClass?->name,
                'level' => $level,
                'class_tutor' => $student->schoolClass?->teacher?->display_name
                    ?: $student->schoolClass?->teacher?->user?->name,
            ],
            'academic_year' => $year,
            'term' => $term,
            'years' => array_values(array_unique($years)),
            'can_edit' => $student->userCanEditAssessments($request->user()),
            'subjects' => $items,
            'summary' => [
                'overall' => $overall,
                'grade' => $overallGrade['grade'],
                'remark' => $overallGrade['remark'],
                'recorded' => $averages->count(),
                'offered' => $items->count(),
            ],
            'term_averages' => $termAverages,
            'teacher_comment' => $report?->teacher_comment,
            'weights' => AssessmentGrading::COMPONENTS,
        ];
    }

    protected function termAverage(Student $student, string $year, int $term): ?float
    {
        $rows = StudentAssessment::query()
            ->where('student_id', $student->id)
            ->where('academic_year', $year)
            ->where('term', $term)
            ->get();

        $averages = $rows->map(fn (StudentAssessment $row) => AssessmentGrading::average([
            'classwork' => $row->classwork,
            'project' => $row->project,
            'assignment' => $row->assignment,
            'homework' => $row->homework,
        ]))->filter(fn ($value) => $value !== null);

        return $averages->count() ? round($averages->avg(), 1) : null;
    }
}
