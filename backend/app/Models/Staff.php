<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'salary_grade_id',
    'employee_id',
    'title',
    'first_name',
    'middle_name',
    'last_name',
    'gender',
    'date_of_birth',
    'nationality',
    'hometown',
    'region',
    'marital_status',
    'ghana_card_number',
    'phone',
    'alternate_phone',
    'email',
    'residential_address',
    'digital_address',
    'department',
    'job_title',
    'rank',
    'employment_type',
    'first_appointment_date',
    'assumption_date',
    'current_posting',
    'highest_qualification',
    'professional_qualification',
    'subject_specialization',
    'ntc_number',
    'years_of_experience',
    'salary',
    'salary_type',
    'bank_name',
    'bank_branch',
    'bank_account',
    'account_name',
    'ssnit_number',
    'tin',
    'hire_date',
    'status',
    'next_of_kin_name',
    'next_of_kin_relationship',
    'next_of_kin_phone',
])]
class Staff extends Model
{
    protected $table = 'staff';

    protected $appends = ['display_name'];

    protected function casts(): array
    {
        return [
            'salary' => 'decimal:2',
            'hire_date' => 'date',
            'date_of_birth' => 'date',
            'first_appointment_date' => 'date',
            'assumption_date' => 'date',
        ];
    }

    public function getDisplayNameAttribute(): string
    {
        $name = trim(collect([$this->title, $this->first_name, $this->middle_name, $this->last_name])->filter()->implode(' '));
        if ($name !== '') {
            return $name;
        }

        return $this->user?->name ?: $this->employee_id ?: '—';
    }

    public static function nextEmployeeId(): string
    {
        $year = now()->year;
        $prefix = 'SMS-'.$year.'-';
        $latest = static::query()
            ->where('employee_id', 'like', $prefix.'%')
            ->orderByDesc('employee_id')
            ->value('employee_id');

        $sequence = 1;
        if ($latest && preg_match('/'.preg_quote($prefix, '/').'(\d+)$/', $latest, $matches)) {
            $sequence = ((int) $matches[1]) + 1;
        }

        do {
            $candidate = $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
            $sequence++;
        } while (static::query()->where('employee_id', $candidate)->exists());

        return $candidate;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function salaryGrade(): BelongsTo
    {
        return $this->belongsTo(SalaryGrade::class);
    }

    public function allowances(): HasMany
    {
        return $this->hasMany(StaffAllowance::class);
    }

    public function loans(): HasMany
    {
        return $this->hasMany(Loan::class);
    }

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class, 'teacher_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(StaffAttendance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function payrolls(): HasMany
    {
        return $this->hasMany(Payroll::class);
    }

    public function activeLoan(): ?Loan
    {
        return $this->loans()->where('status', 'active')->orderByDesc('id')->first();
    }
}
