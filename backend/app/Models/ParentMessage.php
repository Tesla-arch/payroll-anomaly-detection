<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'sender_id',
    'type',
    'subject',
    'body',
    'meeting_at',
    'meeting_venue',
    'is_broadcast',
    'sent_count',
    'failed_count',
])]
class ParentMessage extends Model
{
    protected function casts(): array
    {
        return [
            'meeting_at' => 'datetime',
            'is_broadcast' => 'boolean',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(ParentMessageRecipient::class);
    }
}
