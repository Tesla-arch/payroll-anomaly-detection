<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LeaveRequest;
use App\Models\ParentMessage;
use App\Models\Payroll;
use App\Models\PayrollAnomaly;
use App\Models\PayrollRun;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    public const SENSITIVE_ACTIONS = [
        'payroll_run.approved',
        'payroll_run.paid',
        'payroll_run.cancelled',
        'payroll.excluded',
        'staff.deactivated',
        'anomaly.resolved',
        'anomaly.false_positive',
    ];

    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()->with([
            'user.role',
            'auditable' => function (MorphTo $morphTo) {
                $morphTo->morphWith([
                    Payroll::class => ['staff', 'payrollRun'],
                    PayrollAnomaly::class => ['staff'],
                    LeaveRequest::class => ['staff'],
                    Staff::class => [],
                    User::class => [],
                    PayrollRun::class => [],
                    ParentMessage::class => [],
                ]);
            },
        ])->latest();

        $this->applyFilters($query, $request);

        $page = $query->paginate($request->integer('per_page', 40));
        $page->setCollection($page->getCollection()->map(fn (AuditLog $log) => $this->present($log)));

        return response()->json($page);
    }

    public function summary(Request $request): JsonResponse
    {
        $filtered = AuditLog::query();
        $this->applyFilters($filtered, $request);

        $byAction = (clone $filtered)
            ->select('action', DB::raw('count(*) as total'))
            ->groupBy('action')
            ->orderByDesc('total')
            ->get();

        $byModule = [];
        foreach ($byAction as $row) {
            $module = $this->moduleFor($row->action);
            $byModule[$module] = ($byModule[$module] ?? 0) + (int) $row->total;
        }
        arsort($byModule);

        $actorRows = (clone $filtered)
            ->whereNotNull('user_id')
            ->select('user_id', DB::raw('count(*) as total'))
            ->groupBy('user_id')
            ->orderByDesc('total')
            ->limit(8)
            ->get();

        $users = User::query()
            ->with('role')
            ->whereIn('id', $actorRows->pluck('user_id'))
            ->get()
            ->keyBy('id');

        $actors = $actorRows->map(function ($row) use ($users) {
            $user = $users->get($row->user_id);

            return [
                'id' => $row->user_id,
                'total' => (int) $row->total,
                'name' => $user ? trim($user->first_name.' '.$user->last_name) : 'Unknown',
                'email' => $user?->email,
                'role' => $user?->role?->name,
            ];
        })->values();

        $byDay = (clone $filtered)
            ->where('created_at', '>=', now()->subDays(13)->startOfDay())
            ->selectRaw('date(created_at) as day, count(*) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($row) => [
                'day' => $row->day,
                'total' => (int) $row->total,
            ]);

        $sensitive = (clone $filtered)
            ->whereIn('action', self::SENSITIVE_ACTIONS)
            ->count();

        return response()->json([
            'total' => (clone $filtered)->count(),
            'today' => (clone $filtered)->whereDate('created_at', now()->toDateString())->count(),
            'sensitive' => $sensitive,
            'by_module' => collect($byModule)->map(fn ($total, $module) => [
                'module' => $module,
                'total' => $total,
            ])->values(),
            'by_action' => $byAction->map(fn ($row) => [
                'action' => $row->action,
                'total' => (int) $row->total,
            ])->values(),
            'by_day' => $byDay,
            'actors' => $actors,
        ]);
    }

    private function applyFilters($query, Request $request): void
    {
        $module = $request->string('module')->toString();
        if ($module !== '' && $module !== 'all') {
            if ($module === 'payroll') {
                $query->where(function ($inner) {
                    $inner->where('action', 'like', 'payroll.%')
                        ->orWhere('action', 'like', 'payroll_run.%');
                });
            } else {
                $query->where('action', 'like', $module.'.%');
            }
        }

        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->date('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->date('to'));
        }

        if ($request->boolean('sensitive')) {
            $query->whereIn('action', self::SENSITIVE_ACTIONS);
        }

        $search = $request->string('search')->toString();
        if ($search !== '') {
            $query->where(function ($inner) use ($search) {
                $inner->where('action', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($user) use ($search) {
                        $user->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }
    }

    private function present(AuditLog $log): array
    {
        $user = $log->user;

        return [
            'id' => $log->id,
            'action' => $log->action,
            'module' => $this->moduleFor($log->action),
            'metadata' => $log->metadata ?: new \stdClass,
            'ip_address' => $log->ip_address,
            'created_at' => $log->created_at?->toIso8601String(),
            'is_sensitive' => in_array($log->action, self::SENSITIVE_ACTIONS, true),
            'user' => $user ? [
                'id' => $user->id,
                'name' => trim($user->first_name.' '.$user->last_name) ?: $user->email,
                'email' => $user->email,
                'role' => $user->role?->name,
                'role_slug' => $user->role?->slug,
            ] : null,
            'subject' => $this->subject($log),
        ];
    }

    private function moduleFor(string $action): string
    {
        $prefix = explode('.', $action, 2)[0];

        return match ($prefix) {
            'payroll_run', 'payroll' => 'payroll',
            default => $prefix,
        };
    }

    private function subject(AuditLog $log): ?array
    {
        if (! $log->auditable_type || ! $log->auditable_id) {
            return null;
        }

        $type = class_basename($log->auditable_type);
        $model = $log->auditable;
        $meta = is_array($log->metadata) ? $log->metadata : [];

        $label = match ($type) {
            'PayrollRun' => $model?->run_name,
            'Payroll' => $model?->staff?->display_name ?: $model?->staff?->employee_id,
            'PayrollAnomaly' => $model?->title ?: ($meta['title'] ?? $model?->rule_code),
            'Staff' => $model?->display_name ?: $model?->employee_id,
            'LeaveRequest' => $model?->staff?->display_name,
            'User' => $model ? trim($model->first_name.' '.$model->last_name) : null,
            'ParentMessage' => $model?->subject,
            'SchoolClass' => $model?->name ?: ($meta['class_name'] ?? null),
            'Subject' => $model?->name ?: ($meta['subject'] ?? null),
            default => null,
        };

        $href = match ($type) {
            'PayrollRun' => '/payroll/'.$log->auditable_id,
            'Payroll' => ($model?->payroll_run_id ?: ($meta['payroll_run_id'] ?? null))
                ? '/payroll/'.($model?->payroll_run_id ?: $meta['payroll_run_id'])
                : null,
            'PayrollAnomaly' => '/anomalies/'.$log->auditable_id,
            'Staff' => '/staff/'.$log->auditable_id.'/edit',
            'LeaveRequest' => '/leave',
            'User' => str_starts_with($log->action, 'parent') ? '/parents' : '/users',
            'ParentMessage' => '/parents?tab=sent',
            'SchoolClass' => '/classes',
            'Subject' => '/classes',
            default => null,
        };

        return [
            'type' => $type,
            'id' => $log->auditable_id,
            'label' => $label ?: $type.' #'.$log->auditable_id,
            'href' => $href,
        ];
    }
}
