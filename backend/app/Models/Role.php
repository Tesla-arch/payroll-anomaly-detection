<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug'])]
class Role extends Model
{
    /** Officers who may open a first-time portal account themselves. */
    public const SELF_REGISTER_SLUGS = ['super_admin', 'headteacher', 'hr_officer', 'auditor'];

    /** Employees who sign in with the staff ID issued at employment, plus their file email. */
    public const STAFF_PORTAL_SLUGS = ['teacher', 'payroll_officer', 'accountant'];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function canSelfRegister(): bool
    {
        return in_array($this->slug, self::SELF_REGISTER_SLUGS, true);
    }

    public function usesStaffIdLogin(): bool
    {
        return in_array($this->slug, self::STAFF_PORTAL_SLUGS, true);
    }
}
