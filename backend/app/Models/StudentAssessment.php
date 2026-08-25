<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'student_id',
    'subject_id',
    'academic_year',
    'term',
    'classwork',
    'project',
    'assignment',
    'homework',
    'remark',
    'recorded_by',
])]
class StudentAssessment extends Model
{
    protected function casts(): array
    {
        return [
            'classwork' => 'float',
            'project' => 'float',
            'assignment' => 'float',
            'homework' => 'float',
            'term' => 'integer',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
