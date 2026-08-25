<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'basic_salary', 'max_allowance_total', 'description'])]
class SalaryGrade extends Model
{
    protected function casts(): array
    {
        return [
            'basic_salary' => 'decimal:2',
            'max_allowance_total' => 'decimal:2',
        ];
    }

    public function staff(): HasMany
    {
        return $this->hasMany(Staff::class);
    }
}
