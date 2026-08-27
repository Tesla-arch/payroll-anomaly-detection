<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Staff;
use App\Models\User;
use App\Support\Auditor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Staff::query()->with(['user', 'salaryGrade']);

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('employee_id', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%")
                    ->orWhere('job_title', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($u) => $u->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->orderBy('employee_id')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $requested = $data['employee_id'] ?? null;
        if (! $requested || Staff::query()->where('employee_id', $requested)->exists()) {
            $data['employee_id'] = Staff::nextEmployeeId();
        }

        $staff = Staff::query()->create($data);
        $login = $this->provisionPortalLogin($staff, $request);
        Auditor::log('staff.created', $staff, ['employee_id' => $staff->employee_id], $request->user(), $request);

        $payload = $staff->load(['user.role', 'salaryGrade', 'allowances', 'loans'])->toArray();
        if ($login) {
            $payload['portal_login'] = $login;
        }

        return response()->json($payload, 201);
    }

    public function nextId(): JsonResponse
    {
        return response()->json(['employee_id' => Staff::nextEmployeeId()]);
    }

    public function show(Staff $staff): JsonResponse
    {
        return response()->json($staff->load([
            'user.role', 'salaryGrade', 'allowances.allowanceType', 'loans',
        ]));
    }

    public function update(Request $request, Staff $staff): JsonResponse
    {
        $staff->update($this->validated($request, $staff));
        $this->syncLinkedUser($staff);
        Auditor::log('staff.updated', $staff, [], $request->user(), $request);

        return response()->json($staff->load(['user.role', 'salaryGrade']));
    }

    public function deactivate(Request $request, Staff $staff): JsonResponse
    {
        $staff->update(['status' => 'inactive']);
        Auditor::log('staff.deactivated', $staff, [], $request->user(), $request);

        return response()->json($staff);
    }

    protected function validated(Request $request, ?Staff $staff = null): array
    {
        return $request->validate([
            'user_id' => ['nullable', 'exists:users,id'],
            'salary_grade_id' => ['nullable', 'exists:salary_grades,id'],
            'employee_id' => array_values(array_filter([
                'nullable',
                'string',
                'max:50',
                $staff ? Rule::unique('staff', 'employee_id')->ignore($staff) : null,
            ])),
            'title' => ['nullable', 'string', 'max:20'],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'gender' => ['nullable', 'in:male,female'],
            'date_of_birth' => ['nullable', 'date'],
            'nationality' => ['nullable', 'string', 'max:80'],
            'hometown' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:80'],
            'marital_status' => ['nullable', 'in:single,married,divorced,widowed'],
            'ghana_card_number' => ['nullable', 'string', 'max:30'],
            'phone' => ['nullable', 'string', 'max:30'],
            'alternate_phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'residential_address' => ['nullable', 'string', 'max:255'],
            'digital_address' => ['nullable', 'string', 'max:40'],
            'department' => ['nullable', 'string', 'max:100'],
            'job_title' => ['nullable', 'string', 'max:100'],
            'rank' => ['nullable', 'string', 'max:100'],
            'employment_type' => ['nullable', 'string', 'max:50'],
            'first_appointment_date' => ['nullable', 'date'],
            'assumption_date' => ['nullable', 'date'],
            'hire_date' => ['nullable', 'date'],
            'current_posting' => ['nullable', 'string', 'max:150'],
            'highest_qualification' => ['nullable', 'string', 'max:120'],
            'professional_qualification' => ['nullable', 'string', 'max:120'],
            'subject_specialization' => ['nullable', 'string', 'max:120'],
            'ntc_number' => ['nullable', 'string', 'max:50'],
            'years_of_experience' => ['nullable', 'integer', 'min:0', 'max:50'],
            'salary' => ['required', 'numeric', 'min:0'],
            'salary_type' => ['nullable', 'in:monthly,weekly'],
            'bank_name' => ['nullable', 'string', 'max:100'],
            'bank_branch' => ['nullable', 'string', 'max:100'],
            'bank_account' => ['nullable', 'string', 'max:50'],
            'account_name' => ['nullable', 'string', 'max:150'],
            'ssnit_number' => ['nullable', 'string', 'max:50'],
            'tin' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'in:active,inactive,probation,on_transfer,retired'],
            'next_of_kin_name' => ['nullable', 'string', 'max:150'],
            'next_of_kin_relationship' => ['nullable', 'string', 'max:50'],
            'next_of_kin_phone' => ['nullable', 'string', 'max:30'],
        ]);
    }

    /**
     * Teachers, payroll officers and accountants receive a portal login keyed to the generated staff ID.
     *
     * @return array{employee_id: string, email: string, role: string}|null
     */
    protected function provisionPortalLogin(Staff $staff, Request $request): ?array
    {
        if ($staff->user_id || blank($staff->email)) {
            return null;
        }

        $slug = $request->input('portal_role', 'teacher');
        if (! in_array($slug, Role::STAFF_PORTAL_SLUGS, true)) {
            throw ValidationException::withMessages([
                'portal_role' => ['Choose Teacher, Payroll Officer or Accountant for this staff login.'],
            ]);
        }

        if (User::query()->where('email', $staff->email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['This email already has a portal login. Use a different employment email.'],
            ]);
        }

        $password = $request->input('portal_password') ?: 'password';
        if (strlen((string) $password) < 8) {
            throw ValidationException::withMessages([
                'portal_password' => ['The first login password must be at least 8 characters.'],
            ]);
        }

        $user = User::query()->create([
            'first_name' => $staff->first_name,
            'last_name' => $staff->last_name,
            'email' => $staff->email,
            'phone' => $staff->phone,
            'password' => $password,
            'role_id' => Role::query()->where('slug', $slug)->value('id'),
            'status' => 'active',
        ]);

        $staff->update(['user_id' => $user->id]);
        $staff->load('user.role');

        return [
            'employee_id' => $staff->employee_id,
            'email' => $staff->email,
            'role' => $slug,
        ];
    }

    protected function syncLinkedUser(Staff $staff): void
    {
        $user = $staff->user;
        if (! $user) {
            return;
        }

        $updates = [
            'first_name' => $staff->first_name ?: $user->first_name,
            'last_name' => $staff->last_name ?: $user->last_name,
            'phone' => $staff->phone ?: $user->phone,
        ];
        if (filled($staff->email) && $staff->email !== $user->email) {
            if (User::query()->where('email', $staff->email)->where('id', '!=', $user->id)->exists()) {
                throw ValidationException::withMessages([
                    'email' => ['This email already belongs to another portal login.'],
                ]);
            }
            $updates['email'] = $staff->email;
        }
        $user->update($updates);
    }
}
