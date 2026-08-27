<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parent_messages', function (Blueprint $table) {
            $table->json('channels')->nullable()->after('is_broadcast');
        });

        Schema::table('parent_message_recipients', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('email');
            $table->string('email_status')->nullable()->after('phone');
            $table->string('whatsapp_status')->nullable()->after('email_status');
            $table->string('whatsapp_error')->nullable()->after('error');
        });
    }

    public function down(): void
    {
        Schema::table('parent_message_recipients', function (Blueprint $table) {
            $table->dropColumn(['phone', 'email_status', 'whatsapp_status', 'whatsapp_error']);
        });

        Schema::table('parent_messages', function (Blueprint $table) {
            $table->dropColumn('channels');
        });
    }
};
