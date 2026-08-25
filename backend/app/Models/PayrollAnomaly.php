<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'scan_batch_id',
    'payroll_run_id',
    'payroll_id',
    'staff_id',
    'rule_code',
    'category',
    'severity',
    'title',
    'description',
    'evidence',
    'confidence_score',
    'risk_score',
    'recommended_action',
    'status',
    'detected_at',
    'resolved_at',
    'resolved_by',
    'resolution_notes',
])]
class PayrollAnomaly extends Model
{
    protected function casts(): array
    {
        return [
            'evidence' => 'array',
            'confidence_score' => 'decimal:2',
            'risk_score' => 'decimal:2',
            'detected_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
