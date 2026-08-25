<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'level', 'capacity', 'teacher_id', 'sort_order'])]
class SchoolClass extends Model
{
    public const CATALOGUE = [
        ['name' => 'Grade 1', 'level' => 'Lower Primary', 'sort_order' => 1],
        ['name' => 'Grade 2', 'level' => 'Lower Primary', 'sort_order' => 2],
        ['name' => 'Grade 3', 'level' => 'Lower Primary', 'sort_order' => 3],
        ['name' => 'Grade 4', 'level' => 'Upper Primary', 'sort_order' => 4],
        ['name' => 'Grade 5', 'level' => 'Upper Primary', 'sort_order' => 5],
        ['name' => 'Grade 6', 'level' => 'Upper Primary', 'sort_order' => 6],
        ['name' => 'JHS 1', 'level' => 'Junior High', 'sort_order' => 7],
        ['name' => 'JHS 2', 'level' => 'Junior High', 'sort_order' => 8],
        ['name' => 'JHS 3', 'level' => 'Junior High', 'sort_order' => 9],
    ];

    public static function syncCatalogue(): void
    {
        $keep = [];

        foreach (self::CATALOGUE as $row) {
            $class = self::query()->updateOrCreate(
                ['name' => $row['name'], 'level' => $row['level']],
                [
                    'capacity' => 40,
                    'sort_order' => $row['sort_order'],
                ],
            );
            $keep[] = $class->id;
        }

        $fallback = self::query()->where('level', 'Lower Primary')->where('name', 'Grade 3')->value('id');

        self::query()->whereNotIn('id', $keep)->each(function (self $obsolete) use ($fallback) {
            Student::query()->where('class_id', $obsolete->id)->update(['class_id' => $fallback]);
            $obsolete->delete();
        });
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'teacher_id');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'class_id');
    }
}
