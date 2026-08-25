<?php

namespace App\Mail;

use App\Models\ParentMessage;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ParentSchoolMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ParentMessage $notice,
        public User $guardian,
    ) {}

    public function envelope(): Envelope
    {
        $prefix = match ($this->notice->type) {
            'meeting' => 'Meeting: ',
            'broadcast' => 'School notice: ',
            default => '',
        };

        return new Envelope(
            subject: $prefix.$this->notice->subject,
            from: new Address('school@school.gh', 'School Management System'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.parent-notice',
        );
    }
}
