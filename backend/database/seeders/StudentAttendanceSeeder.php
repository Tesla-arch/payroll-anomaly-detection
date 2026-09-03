<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class StudentAttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $end = Carbon::today();
        $start = $end->copy()->subMonths(6)->startOfDay();

        $teacherId = User::query()->where('email', 'teacher@school.gh')->value('id')
            ?? User::query()->value('id');

        $pupils = Student::query()->orderBy('id')->get(['id', 'class_id']);
        if ($pupils->isEmpty()) {
            $this->command?->warn('No students found. Skipping student attendance seed.');

            return;
        }

        $weekdays = [];
        for ($day = $start->copy(); $day->lte($end); $day->addDay()) {
            if (! $day->isWeekend()) {
                $weekdays[] = $day->toDateString();
            }
        }

        $now = now()->toDateTimeString();
        $rows = [];
        $batchSize = 500;
        $written = 0;

        foreach ($pupils as $student) {
            foreach ($weekdays as $date) {
                $status = $this->randomStatus($student->id, $date);
                $rows[] = [
                    'student_id' => $student->id,
                    'class_id' => $student->class_id,
                    'date' => $date,
                    'status' => $status,
                    'notes' => null,
                    'recorded_by' => $teacherId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                if (count($rows) >= $batchSize) {
                    $written += $this->upsertBatch($rows);
                    $rows = [];
                }
            }
        }

        if ($rows !== []) {
            $written += $this->upsertBatch($rows);
        }

        $this->command?->info(sprintf(
            'Student attendance seeded from %s to %s for %d students across %d weekdays (%d rows upserted).',
            $start->toDateString(),
            $end->toDateString(),
            $pupils->count(),
            count($weekdays),
            $written,
        ));
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    protected function upsertBatch(array $rows): int
    {
        StudentAttendance::query()->upsert(
            $rows,
            ['student_id', 'date'],
            ['class_id', 'status', 'notes', 'recorded_by', 'updated_at'],
        );

        return count($rows);
    }

    protected function randomStatus(int $studentId, string $date): string
    {
        // Deterministic mix so re-seeding stays stable.
        $roll = crc32($studentId.'|'.$date) % 100;

        if ($roll < 6) {
            return 'absent';
        }
        if ($roll < 14) {
            return 'late';
        }
        if ($roll < 17) {
            return 'excused';
        }

        return 'present';
    }
}
