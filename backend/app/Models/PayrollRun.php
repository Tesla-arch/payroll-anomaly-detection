<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'run_name',
    'pay_period_start',
    'pay_period_end',
    'payment_date',
    'status',
    'total_staff',
    'total_gross',
    'total_deductions',
    'total_net',
    'created_by',
    'approved_by',
    'approved_at',
])]
class PayrollRun extends Model
{
    protected function casts(): array
    {
        return [
            'pay_period_start' => 'date',
            'pay_period_end' => 'date',
            'payment_date' => 'date',
            'approved_at' => 'datetime',
            'total_gross' => 'decimal:2',
            'total_deductions' => 'decimal:2',
            'total_net' => 'decimal:2',
        ];
    }

    public function payrolls(): HasMany
    {
        return $this->hasMany(Payroll::class);
    }

    public function anomalies(): HasMany
    {
        return $this->hasMany(PayrollAnomaly::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function hasOpenCriticalAnomalies(): bool
    {
        return $this->anomalies()
            ->where('severity', 'critical')
            ->where('status', 'open')
            ->exists();
    }
}
