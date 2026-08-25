<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'payroll_run_id',
    'staff_id',
    'payment_date',
    'basic_salary',
    'allowances',
    'deductions',
    'gross_salary',
    'taxable_income',
    'income_tax',
    'ssnit_contribution',
    'employer_ssnit',
    'loan_deductions',
    'absence_penalties',
    'net_salary',
    'status',
])]
class Payroll extends Model
{
    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'basic_salary' => 'decimal:2',
            'allowances' => 'decimal:2',
            'deductions' => 'decimal:2',
            'gross_salary' => 'decimal:2',
            'taxable_income' => 'decimal:2',
            'income_tax' => 'decimal:2',
            'ssnit_contribution' => 'decimal:2',
            'employer_ssnit' => 'decimal:2',
            'loan_deductions' => 'decimal:2',
            'absence_penalties' => 'decimal:2',
            'net_salary' => 'decimal:2',
        ];
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

    public function anomalies(): HasMany
    {
        return $this->hasMany(PayrollAnomaly::class);
    }
}
