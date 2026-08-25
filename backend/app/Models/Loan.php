<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'staff_id',
    'reference',
    'principal',
    'outstanding_balance',
    'monthly_deduction',
    'status',
    'issued_on',
])]
class Loan extends Model
{
    protected function casts(): array
    {
        return [
            'principal' => 'decimal:2',
            'outstanding_balance' => 'decimal:2',
            'monthly_deduction' => 'decimal:2',
            'issued_on' => 'date',
        ];
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }
}
