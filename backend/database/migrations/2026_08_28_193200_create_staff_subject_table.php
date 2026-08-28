<?php

use App\Models\SchoolClass;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_subject', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->timestamps();
            $table->unique('subject_id');
            $table->unique(['staff_id', 'subject_id']);
        });

        SchoolClass::query()->where('level', 'Junior High')->update(['teacher_id' => null]);
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_subject');
    }
};
