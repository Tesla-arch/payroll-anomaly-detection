<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'staff_id',
    'date',
    'check_in_time',
    'check_out_time',
    'hours_worked',
    'status',
    'penalty_amount',
    'payroll_processed',
])]
class StaffAttendance extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'hours_worked' => 'decimal:2',
            'penalty_amount' => 'decimal:2',
            'payroll_processed' => 'boolean',
        ];
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }
}
