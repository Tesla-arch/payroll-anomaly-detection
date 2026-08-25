<?php

namespace Tests\Feature;

use App\Mail\ParentSchoolMail;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ParentModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_hr_can_register_a_parent_and_link_a_ward(): void
    {
        $this->actingAsRole('hr_officer');

        $student = Student::query()->create([
            'admission_number' => 'ADM-2026-0100',
            'first_name' => 'Kofi',
            'last_name' => 'Boateng',
            'status' => 'active',
        ]);

        $this->postJson('/api/parents', [
            'first_name' => 'Ama',
            'last_name' => 'Boateng',
            'email' => 'ama.boateng@example.com',
            'phone' => '0241111111',
            'student_ids' => [$student->id],
        ])->assertCreated()
            ->assertJsonPath('email', 'ama.boateng@example.com')
            ->assertJsonPath('children.0.admission_number', 'ADM-2026-0100');

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'parent_id' => User::query()->where('email', 'ama.boateng@example.com')->value('id'),
        ]);
    }

    public function test_teacher_cannot_register_a_parent(): void
    {
        $this->actingAsRole('teacher');

        $this->postJson('/api/parents', [
            'first_name' => 'Ama',
            'last_name' => 'Boateng',
            'email' => 'ama.boateng@example.com',
        ])->assertForbidden();
    }

    public function test_teacher_can_email_selected_parents(): void
    {
        Mail::fake();
        $this->actingAsRole('teacher');
        $parent = $this->userWithRole('parent', [
            'email' => 'ward.parent@example.com',
            'first_name' => 'Kwesi',
            'last_name' => 'Appiah',
        ]);

        $this->postJson('/api/parent-messages', [
            'type' => 'notice',
            'subject' => 'Sports day',
            'body' => 'Please send your child in house colours on Friday.',
            'parent_ids' => [$parent->id],
        ])->assertCreated()
            ->assertJsonPath('sent_count', 1)
            ->assertJsonPath('subject', 'Sports day');

        Mail::assertSent(ParentSchoolMail::class, function (ParentSchoolMail $mail) use ($parent) {
            return $mail->hasTo($parent->email) && $mail->notice->subject === 'Sports day';
        });

        $this->assertDatabaseHas('notifications', [
            'user_id' => $parent->id,
            'type' => 'parent_message',
            'title' => 'Sports day',
        ]);
    }

    public function test_broadcast_reaches_every_active_parent(): void
    {
        Mail::fake();
        $this->actingAsRole('headteacher');
        $this->userWithRole('parent', ['email' => 'one@example.com']);
        $this->userWithRole('parent', ['email' => 'two@example.com']);

        $this->postJson('/api/parent-messages', [
            'type' => 'broadcast',
            'subject' => 'Term dates',
            'body' => 'School reopens on 8 September.',
        ])->assertCreated()
            ->assertJsonPath('is_broadcast', true)
            ->assertJsonPath('sent_count', 2);

        Mail::assertSent(ParentSchoolMail::class, 2);
    }

    public function test_meeting_notice_requires_a_time(): void
    {
        $this->actingAsRole('teacher');
        $parent = $this->userWithRole('parent', ['email' => 'meet@example.com']);

        $this->postJson('/api/parent-messages', [
            'type' => 'meeting',
            'subject' => 'PTA meeting',
            'body' => 'Please attend.',
            'parent_ids' => [$parent->id],
        ])->assertStatus(422);
    }

    public function test_meeting_email_is_delivered_to_the_parent_inbox(): void
    {
        Mail::fake();
        $this->actingAsRole('headteacher');
        $parent = $this->userWithRole('parent', ['email' => 'pta@example.com']);

        $this->postJson('/api/parent-messages', [
            'type' => 'meeting',
            'subject' => 'PTA meeting',
            'body' => 'Please attend the first PTA of the term.',
            'meeting_at' => '2026-09-08 09:00:00',
            'meeting_venue' => 'Assembly hall',
            'parent_ids' => [$parent->id],
        ])->assertCreated()
            ->assertJsonPath('type', 'meeting');

        Mail::assertSent(ParentSchoolMail::class, function (ParentSchoolMail $mail) {
            return $mail->envelope()->subject === 'Meeting: PTA meeting'
                && $mail->notice->meeting_venue === 'Assembly hall';
        });
    }

    public function test_parent_cannot_open_the_parent_register(): void
    {
        $this->actingAsRole('parent');

        $this->getJson('/api/parents')->assertForbidden();
    }

    public function test_accountant_cannot_message_parents(): void
    {
        $this->actingAsRole('accountant');

        $this->postJson('/api/parent-messages', [
            'type' => 'broadcast',
            'subject' => 'Fees',
            'body' => 'Please ignore payroll.',
        ])->assertForbidden();
    }
}
