<?php

namespace Database\Seeders;

use App\Models\LeaveRequest;
use App\Models\Staff;
use App\Models\StaffAttendance;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class StaffAttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $end = Carbon::parse($this->boundDate('ATTENDANCE_END', Carbon::today()->toDateString()));
        $start = Carbon::parse($this->boundDate(
            'ATTENDANCE_START',
            $end->copy()->subMonths(3)->toDateString(),
        ))->startOfDay();

        if ($start->gt($end)) {
            $this->command?->error('ATTENDANCE_START must be on or before ATTENDANCE_END.');

            return;
        }

        $staff = Staff::query()->orderBy('id')->get();
        if ($staff->isEmpty()) {
            $this->command?->warn('No staff found. Skipping attendance seed.');

            return;
        }

        $approvedLeave = LeaveRequest::query()
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $end)
            ->whereDate('end_date', '>=', $start)
            ->get()
            ->groupBy('staff_id');

        $created = 0;
        $updated = 0;

        foreach ($staff as $member) {
            $leaveRanges = $approvedLeave->get($member->id, collect());

            for ($day = $start->copy(); $day->lte($end); $day->addDay()) {
                if ($day->isWeekend()) {
                    continue;
                }

                $date = $day->toDateString();
                $onLeave = $leaveRanges->contains(
                    fn (LeaveRequest $leave) => $day->betweenIncluded(
                        Carbon::parse($leave->start_date)->startOfDay(),
                        Carbon::parse($leave->end_date)->endOfDay(),
                    )
                );

                $payload = $onLeave
                    ? $this->leavePayload()
                    : $this->randomPayload($member->id, $date);

                // whereDate avoids SQLite date-cast mismatches that break updateOrCreate.
                $attendance = StaffAttendance::query()
                    ->where('staff_id', $member->id)
                    ->whereDate('date', $date)
                    ->first();

                if ($attendance) {
                    $attendance->update($payload);
                    $updated++;
                } else {
                    StaffAttendance::query()->create([
                        'staff_id' => $member->id,
                        'date' => $date,
                        ...$payload,
                    ]);
                    $created++;
                }
            }
        }

        $this->command?->info(sprintf(
            'Staff attendance seeded from %s to %s for %d staff (%d created, %d updated).',
            $start->toDateString(),
            $end->toDateString(),
            $staff->count(),
            $created,
            $updated,
        ));
    }

    protected function boundDate(string $envKey, string $fallback): string
    {
        $value = getenv($envKey);

        return is_string($value) && $value !== '' ? $value : $fallback;
    }

    protected function leavePayload(): array
    {
        return [
            'check_in_time' => null,
            'check_out_time' => null,
            'hours_worked' => 0,
            'status' => 'on_leave',
            'penalty_amount' => 0,
            'payroll_processed' => false,
        ];
    }

    protected function randomPayload(int $staffId, string $date): array
    {
        // Deterministic "random" so re-running the seeder stays stable.
        $roll = crc32($staffId.'|'.$date) % 100;

        if ($roll < 5) {
            return [
                'check_in_time' => null,
                'check_out_time' => null,
                'hours_worked' => 0,
                'status' => 'absent',
                'penalty_amount' => 0,
                'payroll_processed' => false,
            ];
        }

        if ($roll < 12) {
            $checkIn = sprintf('08:%02d', 15 + ($roll % 30));
            $checkOut = '15:30';

            return [
                'check_in_time' => $checkIn,
                'check_out_time' => $checkOut,
                'hours_worked' => $this->hoursBetween($checkIn, $checkOut),
                'status' => 'late',
                'penalty_amount' => 0,
                'payroll_processed' => false,
            ];
        }

        if ($roll < 15) {
            return [
                'check_in_time' => null,
                'check_out_time' => null,
                'hours_worked' => 0,
                'status' => 'on_leave',
                'penalty_amount' => 0,
                'payroll_processed' => false,
            ];
        }

        $minute = 30 + ($roll % 25);
        $checkIn = sprintf('07:%02d', $minute);
        $checkOut = '14:30';

        return [
            'check_in_time' => $checkIn,
            'check_out_time' => $checkOut,
            'hours_worked' => $this->hoursBetween($checkIn, $checkOut),
            'status' => 'present',
            'penalty_amount' => 0,
            'payroll_processed' => false,
        ];
    }

    protected function hoursBetween(string $in, string $out): float
    {
        $start = Carbon::createFromFormat('H:i', $in);
        $end = Carbon::createFromFormat('H:i', $out);
        if ($end->lessThan($start)) {
            $end->addDay();
        }

        return round($start->diffInMinutes($end) / 60, 2);
    }
}
