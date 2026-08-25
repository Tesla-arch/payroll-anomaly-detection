<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->string('contact_phone')->nullable()->after('reason');
            $table->string('contact_address')->nullable()->after('contact_phone');
            $table->string('handover_to')->nullable()->after('contact_address');
            $table->text('duties_handed_over')->nullable()->after('handover_to');
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['contact_phone', 'contact_address', 'handover_to', 'duties_handed_over']);
        });
    }
};
