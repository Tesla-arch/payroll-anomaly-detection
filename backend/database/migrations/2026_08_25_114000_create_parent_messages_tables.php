<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parent_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('type')->default('notice');
            $table->string('subject');
            $table->text('body');
            $table->timestamp('meeting_at')->nullable();
            $table->string('meeting_venue')->nullable();
            $table->boolean('is_broadcast')->default(false);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->timestamps();
        });

        Schema::create('parent_message_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_message_id')->constrained('parent_messages')->cascadeOnDelete();
            $table->foreignId('parent_id')->constrained('users')->cascadeOnDelete();
            $table->string('email')->nullable();
            $table->string('status')->default('queued');
            $table->string('error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_message_recipients');
        Schema::dropIfExists('parent_messages');
    }
};
