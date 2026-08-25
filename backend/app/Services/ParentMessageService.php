<?php

namespace App\Services;

use App\Mail\ParentSchoolMail;
use App\Models\Notification;
use App\Models\ParentMessage;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ParentMessageService
{
    /**
     * @param  array<int, User>  $parents
     */
    public function send(User $sender, array $data, iterable $parents): ParentMessage
    {
        $notice = ParentMessage::query()->create([
            'sender_id' => $sender->id,
            'type' => $data['type'],
            'subject' => $data['subject'],
            'body' => $data['body'],
            'meeting_at' => $data['meeting_at'] ?? null,
            'meeting_venue' => $data['meeting_venue'] ?? null,
            'is_broadcast' => (bool) ($data['is_broadcast'] ?? false),
        ]);

        $sent = 0;
        $failed = 0;

        foreach ($parents as $parent) {
            $parent->loadMissing('children');
            $email = trim((string) $parent->email);
            $row = [
                'parent_id' => $parent->id,
                'email' => $email ?: null,
                'status' => 'failed',
                'error' => null,
                'sent_at' => null,
            ];

            if ($email === '') {
                $row['error'] = 'No email on file';
                $failed++;
            } else {
                try {
                    Mail::to($email)->send(new ParentSchoolMail($notice, $parent));
                    $row['status'] = 'sent';
                    $row['sent_at'] = now();
                    $sent++;
                    $this->notifyParent($parent, $notice);
                } catch (Throwable $exception) {
                    $row['error'] = substr($exception->getMessage(), 0, 240);
                    $failed++;
                }
            }

            $notice->recipients()->create($row);
        }

        $notice->update([
            'sent_count' => $sent,
            'failed_count' => $failed,
        ]);

        return $notice->fresh(['sender', 'recipients.parent.children.schoolClass']);
    }

    protected function notifyParent(User $parent, ParentMessage $notice): void
    {
        $title = $notice->type === 'meeting'
            ? 'Parent meeting: '.$notice->subject
            : $notice->subject;

        Notification::query()->create([
            'user_id' => $parent->id,
            'type' => 'parent_message',
            'title' => $title,
            'message' => $notice->body,
            'severity' => $notice->type === 'meeting' ? 'high' : 'medium',
        ]);
    }
}
