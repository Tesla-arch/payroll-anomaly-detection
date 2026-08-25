<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class Auditor
{
    public static function log(string $action, ?Model $subject = null, array $metadata = [], ?User $user = null, ?Request $request = null): AuditLog
    {
        $request ??= request();

        return AuditLog::query()->create([
            'user_id' => $user?->id ?? $request?->user()?->id,
            'action' => $action,
            'auditable_type' => $subject ? $subject::class : null,
            'auditable_id' => $subject?->getKey(),
            'metadata' => $metadata,
            'ip_address' => $request?->ip(),
        ]);
    }
}
