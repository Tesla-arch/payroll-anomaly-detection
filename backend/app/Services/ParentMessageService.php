<?php

namespace App\Services;

use App\Mail\ParentSchoolMail;
use App\Models\Notification;
use App\Models\ParentMessage;
use App\Models\User;
use App\Support\GhanaPhone;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ParentMessageService
{
    public function __construct(protected WhatsAppMessageClient $whatsapp) {}

    /**
     * @param  array<int, User>  $parents
     */
    public function send(User $sender, array $data, iterable $parents): ParentMessage
    {
        $channels = $this->channels($data['channels'] ?? null);

        $notice = ParentMessage::query()->create([
            'sender_id' => $sender->id,
            'type' => $data['type'],
            'subject' => $data['subject'],
            'body' => $data['body'],
            'meeting_at' => $data['meeting_at'] ?? null,
            'meeting_venue' => $data['meeting_venue'] ?? null,
            'is_broadcast' => (bool) ($data['is_broadcast'] ?? false),
            'channels' => $channels,
        ]);

        $sent = 0;
        $failed = 0;

        foreach ($parents as $parent) {
            $row = $this->deliver($notice, $parent, $channels);
            if ($row['status'] === 'sent') {
                $sent++;
                $this->notifyParent($parent, $notice);
            } else {
                $failed++;
            }
            $notice->recipients()->create($row);
        }

        $notice->update([
            'sent_count' => $sent,
            'failed_count' => $failed,
        ]);

        return $notice->fresh(['sender', 'recipients.parent']);
    }

    /**
     * @param  array<int, string>|null  $channels
     * @return array<int, string>
     */
    protected function channels(?array $channels): array
    {
        $chosen = collect($channels ?? ['email', 'whatsapp'])
            ->filter(fn ($channel) => in_array($channel, ['email', 'whatsapp'], true))
            ->unique()
            ->values()
            ->all();

        return $chosen ?: ['email', 'whatsapp'];
    }

    /**
     * @param  array<int, string>  $channels
     * @return array<string, mixed>
     */
    protected function deliver(ParentMessage $notice, User $parent, array $channels): array
    {
        $email = trim((string) $parent->email);
        $phone = GhanaPhone::toWhatsApp($parent->phone);
        $errors = [];
        $emailStatus = 'skipped';
        $whatsappStatus = 'skipped';
        $whatsappError = null;

        if (in_array('email', $channels, true)) {
            if ($email === '') {
                $emailStatus = 'failed';
                $errors[] = 'No email on file';
            } else {
                try {
                    Mail::to($email)->send(new ParentSchoolMail($notice, $parent));
                    $emailStatus = 'sent';
                } catch (Throwable $exception) {
                    $emailStatus = 'failed';
                    $errors[] = substr($exception->getMessage(), 0, 240);
                }
            }
        }

        if (in_array('whatsapp', $channels, true)) {
            if (! $phone) {
                $whatsappStatus = 'failed';
                $whatsappError = 'No WhatsApp number on file';
                $errors[] = $whatsappError;
            } else {
                try {
                    $this->whatsapp->send($phone, $this->whatsappBody($notice, $parent));
                    $whatsappStatus = 'sent';
                } catch (Throwable $exception) {
                    $whatsappStatus = 'failed';
                    $whatsappError = substr($exception->getMessage(), 0, 240);
                    $errors[] = $whatsappError;
                }
            }
        }

        $delivered = $emailStatus === 'sent' || $whatsappStatus === 'sent';
        $errorText = implode(' · ', array_unique($errors));

        return [
            'parent_id' => $parent->id,
            'email' => $email !== '' ? $email : null,
            'phone' => $phone,
            'email_status' => $emailStatus,
            'whatsapp_status' => $whatsappStatus,
            'status' => $delivered ? 'sent' : 'failed',
            'error' => $delivered || $errorText === '' ? null : $errorText,
            'whatsapp_error' => $whatsappError,
            'sent_at' => $delivered ? now() : null,
        ];
    }

    protected function whatsappBody(ParentMessage $notice, User $parent): string
    {
        $lines = [
            '*School Management System*',
            $notice->type === 'meeting' ? '*Parent meeting*' : '*School notice*',
            '',
            'Dear '.$parent->name.',',
        ];

        if ($notice->type === 'meeting' && $notice->meeting_at) {
            $when = $notice->meeting_at->timezone(config('app.timezone'))->format('l, j F Y · H:i');
            $lines[] = 'When: '.$when;
            $lines[] = 'Where: '.($notice->meeting_venue ?: 'School compound');
        }

        $lines[] = '';
        $lines[] = $notice->subject;
        $lines[] = $notice->body;
        $lines[] = '';
        $from = GhanaPhone::display(config('services.whatsapp.from_number'));
        $lines[] = $from
            ? 'Sent from the school WhatsApp '.$from.'. Please contact the school office if you need a follow-up.'
            : 'Please contact the school office if you need a follow-up.';

        return implode("\n", $lines);
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
