<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Staff;
use App\Models\User;
use App\Support\Auditor;
use App\Services\RegistrationCaptcha;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function registerRoles(): JsonResponse
    {
        $roles = Role::query()
            ->whereIn('slug', Role::SELF_REGISTER_SLUGS)
            ->orderBy('id')
            ->get(['id', 'name', 'slug'])
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'slug' => $role->slug,
                'name' => match ($role->slug) {
                    'super_admin' => 'Administrator',
                    'headteacher' => 'Headteacher / Headmaster',
                    default => $role->name,
                },
                'hint' => match ($role->slug) {
                    'super_admin' => 'Full school portal, including user accounts.',
                    'headteacher' => 'Approves leave and payroll for the school.',
                    'hr_officer' => 'Staff files, attendance, payroll preparation and the parent register.',
                    'auditor' => 'Audit trail and payroll flags — no pay changes.',
                    default => 'School officer account.',
                },
            ]);

        return response()->json($roles);
    }

    public function captcha(RegistrationCaptcha $captcha): JsonResponse
    {
        return response()->json($captcha->issue());
    }

    public function login(Request $request): JsonResponse
    {
        $request->merge([
            'email' => User::normalizeEmail($request->input('email')),
        ]);

        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::findByEmail($credentials['email'])?->load(['role', 'staff']);

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->role?->usesStaffIdLogin() && $user->staff) {
            throw ValidationException::withMessages([
                'email' => ['Teachers and accountants sign in with their staff ID and the email on their employment file.'],
            ]);
        }

        $this->assertActive($user);

        return $this->issueToken($user, $request, 'auth.login');
    }

    public function loginStaff(Request $request): JsonResponse
    {
        $request->merge([
            'email' => User::normalizeEmail($request->input('email')),
        ]);

        $credentials = $request->validate([
            'employee_id' => ['required', 'string', 'max:50'],
            'email' => ['required', 'email'],
        ]);

        $staff = Staff::query()
            ->with(['user.role'])
            ->whereRaw('lower(employee_id) = ?', [strtolower(trim($credentials['employee_id']))])
            ->first();

        $email = User::normalizeEmail($credentials['email']);
        $fileEmail = User::normalizeEmail((string) ($staff?->email ?: $staff?->user?->email));
        $user = $staff?->user;

        if (! $staff || $fileEmail === '' || $fileEmail !== $email || ! $user) {
            throw ValidationException::withMessages([
                'employee_id' => ['The staff ID and email do not match an employment record.'],
            ]);
        }

        if ($user->role?->canSelfRegister()) {
            throw ValidationException::withMessages([
                'employee_id' => ['Administrators, HR officers, auditors and headteachers sign in with their email and password.'],
            ]);
        }

        if (! $user->role?->usesStaffIdLogin()) {
            throw ValidationException::withMessages([
                'employee_id' => ['This account does not use staff-ID sign-in. Use the officer login.'],
            ]);
        }

        if ($staff->status === 'inactive') {
            throw ValidationException::withMessages([
                'employee_id' => ['This staff file is inactive. Ask HR to restore it before you sign in.'],
            ]);
        }

        $this->assertActive($user);

        return $this->issueToken($user->load(['role', 'staff']), $request, 'auth.login.staff');
    }

    public function register(Request $request, RegistrationCaptcha $captcha): JsonResponse
    {
        $request->merge([
            'email' => User::normalizeEmail($request->input('email')),
        ]);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'role' => ['required', 'string', Rule::in(Role::SELF_REGISTER_SLUGS)],
            'captcha_id' => ['required', 'uuid'],
            'captcha' => ['required', 'string', 'max:12'],
        ]);

        if (! $captcha->verify($data['captcha_id'], $data['captcha'])) {
            throw ValidationException::withMessages([
                'captcha' => ['The security code is incorrect or has expired. Refresh the image and try again.'],
            ]);
        }

        $role = Role::query()->where('slug', $data['role'])->first();
        if (! $role) {
            throw ValidationException::withMessages([
                'role' => ['The selected desk is not available for first-time registration.'],
            ]);
        }

        $user = User::query()->create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'password' => $data['password'],
            'role_id' => $role->id,
            'status' => 'active',
        ]);

        $user->load(['role', 'staff']);

        return $this->issueToken($user, $request, 'auth.register', 201);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->payload($request->user()->load('role', 'staff'))]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        Auditor::log('auth.logout', $request->user(), [], $request->user(), $request);

        return response()->json(['message' => 'Logged out']);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        if (! Hash::check($data['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $request->user()->update(['password' => $data['password']]);

        return response()->json(['message' => 'Password updated']);
    }

    protected function assertActive(User $user): void
    {
        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['This account is inactive.'],
            ]);
        }
    }

    protected function issueToken(User $user, Request $request, string $action, int $status = 200): JsonResponse
    {
        $token = $user->createToken('api')->plainTextToken;
        Auditor::log($action, $user, [], $user, $request);

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->payload($user),
        ], $status);
    }

    protected function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'status' => $user->status,
            'role' => $user->role,
            'staff_id' => $user->staff?->id,
            'employee_id' => $user->staff?->employee_id,
        ];
    }
}
