<?php

namespace App\Services;

class AssessmentGrading
{
    public const COMPONENTS = [
        'classwork' => 0.30,
        'assignment' => 0.25,
        'project' => 0.25,
        'homework' => 0.20,
    ];

    public static function currentAcademicYear(): string
    {
        $start = now()->month >= 9 ? now()->year : now()->year - 1;

        return $start.'/'.($start + 1);
    }

    public static function currentTerm(): int
    {
        $month = now()->month;
        if ($month >= 9) {
            return 1;
        }
        if ($month <= 4) {
            return 2;
        }

        return 3;
    }

    public static function average(array $scores): ?float
    {
        $total = 0.0;
        $weight = 0.0;

        foreach (self::COMPONENTS as $key => $share) {
            if (! array_key_exists($key, $scores) || $scores[$key] === null || $scores[$key] === '') {
                continue;
            }
            $total += (float) $scores[$key] * $share;
            $weight += $share;
        }

        if ($weight <= 0) {
            return null;
        }

        return round($total / $weight, 1);
    }

    public static function grade(?float $average): array
    {
        if ($average === null) {
            return ['grade' => '—', 'remark' => 'Not recorded'];
        }

        return match (true) {
            $average >= 80 => ['grade' => 'A', 'remark' => 'Excellent'],
            $average >= 70 => ['grade' => 'B', 'remark' => 'Very good'],
            $average >= 60 => ['grade' => 'C', 'remark' => 'Good'],
            $average >= 50 => ['grade' => 'D', 'remark' => 'Credit'],
            $average >= 40 => ['grade' => 'E', 'remark' => 'Pass'],
            default => ['grade' => 'F', 'remark' => 'Needs support'],
        };
    }
}
