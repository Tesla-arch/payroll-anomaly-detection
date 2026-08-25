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
        $teacherId = User::query()->where('email', 'teacher@school.gh')->value('id');
        $pupils = Student::query()->where('status', 'active')->get();
        $start = Carbon::today();
        $days = [];
        while (count($days) < 5) {
            if (! $start->isWeekend()) {
                $days[] = $start->toDateString();
            }
            $start->subDay();
        }

        foreach ($pupils as $student) {
            foreach ($days as $index => $date) {
                $status = 'present';
                if ($index === 1 && $student->id % 2 === 0) {
                    $status = 'late';
                }
                if ($index === 3 && $student->id % 3 === 0) {
                    $status = 'absent';
                }
                StudentAttendance::query()->updateOrCreate(
                    [
                        'student_id' => $student->id,
                        'date' => $date,
                    ],
                    [
                        'class_id' => $student->class_id,
                        'status' => $status,
                        'recorded_by' => $teacherId,
                    ],
                );
            }
        }
    }
}
