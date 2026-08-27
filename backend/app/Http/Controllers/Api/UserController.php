<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Support\Auditor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with(['role', 'staff'])->orderBy('first_name');
        $this->applyFilters($query, $request);

        $page = $query->paginate($request->integer('per_page', 40));
        $page->setCollection($page->getCollection()->map(fn (User $user) => $this->present($user)));

        return response()->json($page);
    }

    public function summary(Request $request): JsonResponse
    {
        $base = User::query();
        $search = $request->string('search')->toString();
        if ($search !== '') {
            $base->where(function ($inner) use ($search) {
                $inner->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $byRole = Role::query()
            ->withCount(['users as total' => function ($query) use ($search) {
                if ($search !== '') {
                    $query->where(function ($inner) use ($search) {
                        $inner->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
                }
            }])
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'slug' => $role->slug,
                'name' => $role->name,
                'total' => (int) $role->total,
            ])
            ->values();

        return response()->json([
            'total' => (clone $base)->count(),
            'active' => (clone $base)->where('status', 'active')->count(),
            'inactive' => (clone $base)->where('status', 'inactive')->count(),
            'by_role' => $byRole,
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($this->present($user->load(['role', 'staff'])));
    }

    public function roles(): JsonResponse
    {
        return response()->json(Role::query()->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:8'],
            'role_id' => ['required', 'exists:roles,id'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);

        $user = User::query()->create($data);
        Auditor::log('user.created', $user, ['role_id' => $user->role_id], $request->user(), $request);

        return response()->json($this->present($user->load(['role', 'staff'])), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'email', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['nullable', 'string', 'min:8'],
            'role_id' => ['sometimes', 'exists:roles,id'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        if (($data['status'] ?? null) === 'inactive' && $user->id === $request->user()?->id) {
            throw ValidationException::withMessages([
                'status' => 'You cannot deactivate your own account.',
            ]);
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);
        Auditor::log('user.updated', $user, array_keys($data), $request->user(), $request);

        return response()->json($this->present($user->fresh(['role', 'staff'])));
    }

    private function applyFilters($query, Request $request): void
    {
        if ($request->filled('status') && $request->string('status') !== 'all') {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('role') && $request->string('role') !== 'all') {
            $query->whereHas('role', fn ($role) => $role->where('slug', $request->string('role')));
        }

        $search = $request->string('search')->toString();
        if ($search !== '') {
            $query->where(function ($inner) use ($search) {
                $inner->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }
    }

    private function present(User $user): array
    {
        $staff = $user->staff;

        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'status' => $user->status,
            'created_at' => $user->created_at?->toIso8601String(),
            'role' => $user->role ? [
                'id' => $user->role->id,
                'name' => $user->role->name,
                'slug' => $user->role->slug,
            ] : null,
            'staff' => $staff ? [
                'id' => $staff->id,
                'employee_id' => $staff->employee_id,
                'display_name' => $staff->display_name,
            ] : null,
        ];
    }
}
