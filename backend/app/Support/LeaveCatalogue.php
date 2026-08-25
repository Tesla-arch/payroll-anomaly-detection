<?php

namespace App\Support;

use App\Models\LeaveRequest;
use Carbon\CarbonInterface;

class LeaveCatalogue
{
    public const TYPES = [
        'annual' => [
            'code' => 'annual',
            'name' => 'Annual leave',
            'hint' => 'Earned rest after continuous service. Labour Act / GES practice.',
            'entitlement' => 28,
            'max_per_request' => 28,
            'count' => 'working',
            'requires_note' => false,
        ],
        'casual' => [
            'code' => 'casual',
            'name' => 'Casual leave',
            'hint' => 'Short personal business that cannot wait for annual leave.',
            'entitlement' => 7,
            'max_per_request' => 3,
            'count' => 'working',
            'requires_note' => true,
        ],
        'sick' => [
            'code' => 'sick',
            'name' => 'Sick leave',
            'hint' => 'Illness. A medical certificate is expected after two days.',
            'entitlement' => 30,
            'max_per_request' => 30,
            'count' => 'calendar',
            'requires_note' => true,
        ],
        'maternity' => [
            'code' => 'maternity',
            'name' => 'Maternity leave',
            'hint' => 'Labour Act maternity leave — up to 12 weeks (84 calendar days).',
            'entitlement' => 84,
            'max_per_request' => 84,
            'count' => 'calendar',
            'requires_note' => true,
        ],
        'paternity' => [
            'code' => 'paternity',
            'name' => 'Paternity leave',
            'hint' => 'For a new child. Usually taken around the date of birth.',
            'entitlement' => 5,
            'max_per_request' => 5,
            'count' => 'working',
            'requires_note' => false,
        ],
        'compassionate' => [
            'code' => 'compassionate',
            'name' => 'Compassionate / bereavement',
            'hint' => 'Death or serious illness of a close relative.',
            'entitlement' => 5,
            'max_per_request' => 5,
            'count' => 'working',
            'requires_note' => true,
        ],
        'study' => [
            'code' => 'study',
            'name' => 'Study / examination leave',
            'hint' => 'Approved exams, INSET or short courses.',
            'entitlement' => 15,
            'max_per_request' => 10,
            'count' => 'working',
            'requires_note' => true,
        ],
        'official' => [
            'code' => 'official',
            'name' => 'Official / duty leave',
            'hint' => 'GES workshop, sports, or official assignment.',
            'entitlement' => 10,
            'max_per_request' => 10,
            'count' => 'working',
            'requires_note' => true,
        ],
        'unpaid' => [
            'code' => 'unpaid',
            'name' => 'Leave without pay',
            'hint' => 'Used when paid leave is exhausted. Affects payroll.',
            'entitlement' => 30,
            'max_per_request' => 30,
            'count' => 'calendar',
            'requires_note' => true,
        ],
    ];

    public static function codes(): array
    {
        return array_keys(self::TYPES);
    }

    public static function get(string $code): ?array
    {
        return self::TYPES[$code] ?? null;
    }

    public static function countDays(CarbonInterface $start, CarbonInterface $end, string $count = 'working'): int
    {
        if ($end->lt($start)) {
            return 0;
        }

        if ($count === 'calendar') {
            return (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1;
        }

        $days = 0;
        for ($day = $start->copy(); $day->lte($end); $day->addDay()) {
            if (! $day->isWeekend()) {
                $days++;
            }
        }

        return $days;
    }

    public static function usedDays(int $staffId, string $type, ?int $year = null): int
    {
        $year ??= now()->year;

        return (int) LeaveRequest::query()
            ->where('staff_id', $staffId)
            ->where('leave_type', $type)
            ->whereYear('start_date', $year)
            ->whereIn('status', ['pending_hr', 'pending_headteacher', 'approved'])
            ->sum('days_requested');
    }

    public static function balances(int $staffId, ?int $year = null): array
    {
        return collect(self::TYPES)->map(function (array $type) use ($staffId, $year) {
            $used = self::usedDays($staffId, $type['code'], $year);

            return [
                ...$type,
                'used' => $used,
                'remaining' => max(0, $type['entitlement'] - $used),
            ];
        })->values()->all();
    }
}
