<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'code', 'levels', 'sort_order'])]
class Subject extends Model
{
    public const CATALOGUE = [
        ['name' => 'English Language', 'code' => 'ENG', 'levels' => ['Lower Primary', 'Upper Primary', 'Junior High'], 'sort_order' => 1],
        ['name' => 'Ghanaian Language', 'code' => 'GHL', 'levels' => ['Lower Primary', 'Upper Primary', 'Junior High'], 'sort_order' => 2],
        ['name' => 'Mathematics', 'code' => 'MAT', 'levels' => ['Lower Primary', 'Upper Primary', 'Junior High'], 'sort_order' => 3],
        ['name' => 'Science', 'code' => 'SCI', 'levels' => ['Lower Primary', 'Upper Primary'], 'sort_order' => 4],
        ['name' => 'Integrated Science', 'code' => 'ISC', 'levels' => ['Junior High'], 'sort_order' => 5],
        ['name' => 'Our World Our People', 'code' => 'OWP', 'levels' => ['Lower Primary', 'Upper Primary'], 'sort_order' => 6],
        ['name' => 'Social Studies', 'code' => 'SOC', 'levels' => ['Junior High'], 'sort_order' => 7],
        ['name' => 'History', 'code' => 'HIS', 'levels' => ['Upper Primary'], 'sort_order' => 8],
        ['name' => 'Religious and Moral Education', 'code' => 'RME', 'levels' => ['Lower Primary', 'Upper Primary', 'Junior High'], 'sort_order' => 9],
        ['name' => 'Creative Arts', 'code' => 'CRA', 'levels' => ['Lower Primary', 'Upper Primary'], 'sort_order' => 10],
        ['name' => 'Creative Arts and Design', 'code' => 'CAD', 'levels' => ['Junior High'], 'sort_order' => 11],
        ['name' => 'Career Technology', 'code' => 'CAT', 'levels' => ['Junior High'], 'sort_order' => 12],
        ['name' => 'Computing', 'code' => 'ICT', 'levels' => ['Lower Primary', 'Upper Primary', 'Junior High'], 'sort_order' => 13],
        ['name' => 'French', 'code' => 'FRE', 'levels' => ['Upper Primary', 'Junior High'], 'sort_order' => 14],
        ['name' => 'Physical Education', 'code' => 'PHE', 'levels' => ['Lower Primary', 'Upper Primary', 'Junior High'], 'sort_order' => 15],
    ];

    protected function casts(): array
    {
        return [
            'levels' => 'array',
        ];
    }

    public static function syncCatalogue(): void
    {
        foreach (self::CATALOGUE as $row) {
            self::query()->updateOrCreate(
                ['code' => $row['code']],
                [
                    'name' => $row['name'],
                    'levels' => $row['levels'],
                    'sort_order' => $row['sort_order'],
                ],
            );
        }
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(StudentAssessment::class);
    }

    public function offeredIn(?string $level): bool
    {
        if (! $level) {
            return true;
        }

        return in_array($level, $this->levels ?? [], true);
    }
}
