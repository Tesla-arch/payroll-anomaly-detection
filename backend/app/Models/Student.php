<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'admission_number',
    'first_name',
    'middle_name',
    'last_name',
    'gender',
    'date_of_birth',
    'place_of_birth',
    'nationality',
    'hometown',
    'region',
    'religion',
    'birth_certificate_number',
    'previous_school',
    'admission_date',
    'phone_number',
    'residential_address',
    'digital_address',
    'class_id',
    'parent_id',
    'guardian_name',
    'guardian_relationship',
    'guardian_occupation',
    'guardian_phone',
    'guardian_address',
    'emergency_contact_name',
    'emergency_contact_phone',
    'blood_group',
    'nhis_number',
    'allergies',
    'special_needs',
    'status',
])]
class Student extends Model
{
    protected $appends = ['display_name'];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'admission_date' => 'date',
        ];
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(StudentAssessment::class);
    }

    public function termReports(): HasMany
    {
        return $this->hasMany(StudentTermReport::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(StudentAttendance::class);
    }

    public function userCanViewAssessments(User $user): bool
    {
        if ($user->isSuperAdmin() || $user->hasRole('headteacher', 'hr_officer', 'teacher')) {
            return true;
        }

        return $user->hasRole('parent') && $this->parent_id === $user->id;
    }

    public function userCanEditAssessments(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (! $user->hasRole('teacher')) {
            return false;
        }

        $user->loadMissing('staff.subjects');
        $this->loadMissing('schoolClass');

        if ($this->schoolClass?->isJuniorHigh()) {
            return (bool) $user->staff?->teachesJuniorHigh();
        }

        if (! $this->schoolClass?->teacher_id || ! $user->staff) {
            return true;
        }

        return (int) $this->schoolClass->teacher_id === (int) $user->staff->id;
    }

    public function userCanEditSubject(User $user, int $subjectId): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (! $this->userCanEditAssessments($user)) {
            return false;
        }

        if (! $this->schoolClass?->isJuniorHigh()) {
            return true;
        }

        return (bool) $user->staff?->teachesSubject($subjectId);
    }

    public function getNameAttribute(): string
    {
        return $this->display_name;
    }

    public function getDisplayNameAttribute(): string
    {
        return trim(collect([$this->first_name, $this->middle_name, $this->last_name])->filter()->implode(' '));
    }

    public static function nextAdmissionNumber(): string
    {
        $year = now()->year;
        $prefix = 'ADM-'.$year.'-';
        $latest = static::query()
            ->where('admission_number', 'like', $prefix.'%')
            ->orderByDesc('admission_number')
            ->value('admission_number');

        $sequence = 1;
        if ($latest && preg_match('/'.preg_quote($prefix, '/').'(\d+)$/', $latest, $matches)) {
            $sequence = ((int) $matches[1]) + 1;
        }

        do {
            $candidate = $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
            $sequence++;
        } while (static::query()->where('admission_number', $candidate)->exists());

        return $candidate;
    }
}
