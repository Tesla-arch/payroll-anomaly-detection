<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'code', 'is_taxable', 'requires_authorization'])]
class AllowanceType extends Model
{
    protected function casts(): array
    {
        return [
            'is_taxable' => 'boolean',
            'requires_authorization' => 'boolean',
        ];
    }

    public function staffAllowances(): HasMany
    {
        return $this->hasMany(StaffAllowance::class);
    }
}
