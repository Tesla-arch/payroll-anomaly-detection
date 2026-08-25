<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentTermReport;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Seeder;

class AssessmentSeeder extends Seeder
{
    public function run(): void
    {
        Subject::syncCatalogue();

        $teacherId = User::query()->where('email', 'teacher@school.gh')->value('id');
        $year = '2025/2026';
        $comments = [
            1 => 'A promising start to the year. Keep up the classwork and reading at home.',
            2 => 'Steady progress this term. Homework is more consistent and projects show care.',
            3 => 'A solid year overall. Ready for the next class with continued support in weaker subjects.',
        ];

        Student::query()->with('schoolClass')->get()->each(function (Student $student) use ($year, $teacherId, $comments) {
            $level = $student->schoolClass?->level;
            $subjects = Subject::query()->orderBy('sort_order')->get()->filter(fn (Subject $subject) => $subject->offeredIn($level));

            foreach ([1, 2, 3] as $term) {
                foreach ($subjects as $index => $subject) {
                    $base = 58 + (($student->id * 7 + $subject->id * 3 + $term * 5) % 28);
                    StudentAssessment::query()->updateOrCreate(
                        [
                            'student_id' => $student->id,
                            'subject_id' => $subject->id,
                            'academic_year' => $year,
                            'term' => $term,
                        ],
                        [
                            'classwork' => min(100, $base + 6),
                            'assignment' => min(100, $base + (($index % 3) * 2)),
                            'project' => min(100, $base - 2),
                            'homework' => min(100, $base + 4),
                            'recorded_by' => $teacherId,
                        ],
                    );
                }

                StudentTermReport::query()->updateOrCreate(
                    [
                        'student_id' => $student->id,
                        'academic_year' => $year,
                        'term' => $term,
                    ],
                    [
                        'teacher_comment' => $comments[$term],
                        'recorded_by' => $teacherId,
                    ],
                );
            }
        });
    }
}
