<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParentMessage;
use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use App\Services\ParentMessageService;
use App\Support\Auditor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ParentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->parents()
            ->with(['children.schoolClass'])
            ->withCount('children')
            ->orderBy('first_name');

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('children', function ($children) use ($search) {
                        $children->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('admission_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->boolean('unlinked_only')) {
            $query->doesntHave('children');
        }

        $parents = $query->get();

        return response()->json([
            'parents' => $parents,
            'stats' => [
                'parents' => User::query()->parents()->count(),
                'active' => User::query()->parents()->where('status', 'active')->count(),
                'with_email' => User::query()->parents()->where('status', 'active')->whereNotNull('email')->where('email', '!=', '')->count(),
                'with_phone' => User::query()->parents()->where('status', 'active')->whereNotNull('phone')->where('phone', '!=', '')->count(),
                'unlinked_students' => Student::query()->whereNull('parent_id')->count(),
                'messages' => ParentMessage::query()->count(),
            ],
            'students' => Student::query()
                ->with(['schoolClass', 'parent'])
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get(['id', 'admission_number', 'first_name', 'middle_name', 'last_name', 'class_id', 'parent_id', 'status']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertCanManage($request);

        $data = $this->validatedParent($request);
        $roleId = Role::query()->where('slug', 'parent')->value('id');

        $parent = User::query()->create([
            'role_id' => $roleId,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'] ?? 'password',
            'status' => 'active',
        ]);

        $this->syncWards($parent, $data['student_ids'] ?? []);
        Auditor::log('parent.created', $parent, ['student_ids' => $data['student_ids'] ?? []], $request->user(), $request);

        return response()->json($parent->fresh(['children.schoolClass'])->loadCount('children'), 201);
    }

    public function show(User $parent): JsonResponse
    {
        $this->assertParentAccount($parent);

        return response()->json($parent->load(['children.schoolClass'])->loadCount('children'));
    }

    public function update(Request $request, User $parent): JsonResponse
    {
        $this->assertCanManage($request);
        $this->assertParentAccount($parent);

        $data = $this->validatedParent($request, $parent);

        $payload = [
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'status' => $data['status'] ?? $parent->status,
        ];

        if (! empty($data['password'])) {
            $payload['password'] = $data['password'];
        }

        $parent->update($payload);

        if (array_key_exists('student_ids', $data)) {
            $this->syncWards($parent, $data['student_ids'] ?? []);
        }

        Auditor::log('parent.updated', $parent, ['student_ids' => $data['student_ids'] ?? null], $request->user(), $request);

        return response()->json($parent->fresh(['children.schoolClass'])->loadCount('children'));
    }

    public function messages(Request $request): JsonResponse
    {
        $query = ParentMessage::query()
            ->with(['sender', 'recipients.parent'])
            ->latest();

        if ($request->user()->hasRole('parent')) {
            $query->whereHas('recipients', fn ($q) => $q->where('parent_id', $request->user()->id));
        }

        return response()->json($query->limit(40)->get());
    }

    public function send(Request $request, ParentMessageService $mailer): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['notice', 'meeting', 'broadcast'])],
            'subject' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:5000'],
            'meeting_at' => ['required_if:type,meeting', 'nullable', 'date'],
            'meeting_venue' => ['nullable', 'string', 'max:160'],
            'channels' => ['sometimes', 'array', 'min:1'],
            'channels.*' => [Rule::in(['email', 'whatsapp'])],
            'broadcast' => ['sometimes', 'boolean'],
            'parent_ids' => ['required_unless:type,broadcast', 'array'],
            'parent_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $broadcast = $data['type'] === 'broadcast' || $request->boolean('broadcast');
        $parents = $broadcast
            ? User::query()->parents()->where('status', 'active')->get()
            : User::query()->parents()->whereIn('id', $data['parent_ids'] ?? [])->get();

        if ($parents->isEmpty()) {
            throw ValidationException::withMessages([
                'parent_ids' => ['Select at least one registered parent, or broadcast to the full list.'],
            ]);
        }

        $notice = $mailer->send($request->user(), [
            ...$data,
            'is_broadcast' => $broadcast,
        ], $parents);

        Auditor::log('parent.message.sent', $notice, [
            'type' => $notice->type,
            'channels' => $notice->channels,
            'recipients' => $parents->pluck('id')->all(),
            'broadcast' => $broadcast,
        ], $request->user(), $request);

        return response()->json($notice, 201);
    }

    protected function validatedParent(Request $request, ?User $parent = null): array
    {
        $request->merge([
            'email' => User::normalizeEmail($request->input('email')),
        ]);

        return $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:160', Rule::unique('users', 'email')->ignore($parent?->id)],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => [$parent ? 'nullable' : 'required', 'string', 'min:8'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['integer', 'exists:students,id'],
        ]);
    }

    /**
     * @param  array<int, int>  $studentIds
     */
    protected function syncWards(User $parent, array $studentIds): void
    {
        $ids = collect($studentIds)->filter()->map(fn ($id) => (int) $id)->unique()->values();

        Student::query()
            ->where('parent_id', $parent->id)
            ->when($ids->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $ids))
            ->update(['parent_id' => null]);

        if ($ids->isNotEmpty()) {
            Student::query()->whereIn('id', $ids)->update(['parent_id' => $parent->id]);
        }
    }

    protected function assertParentAccount(User $parent): void
    {
        $parent->loadMissing('role');

        if (! $parent->hasRole('parent')) {
            abort(404);
        }
    }

    protected function assertCanManage(Request $request): void
    {
        if ($request->user()->isSuperAdmin() || $request->user()->hasRole('headteacher', 'hr_officer')) {
            return;
        }

        abort(403, 'Only HR, the Headteacher or a super admin can edit the parent register.');
    }
}
