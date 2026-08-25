<?php

use App\Models\SchoolClass;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('school_classes', 'sort_order')) {
            Schema::table('school_classes', function (Blueprint $table) {
                $table->unsignedSmallInteger('sort_order')->default(0)->after('level');
            });
        }

        SchoolClass::syncCatalogue();
    }

    public function down(): void
    {
        // Class catalogue is additive; leaving records in place is safer than dropping live classes.
    }
};
