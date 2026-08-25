<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 20)->unique();
            $table->json('levels');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('student_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('academic_year', 12);
            $table->unsignedTinyInteger('term');
            $table->decimal('classwork', 5, 1)->nullable();
            $table->decimal('project', 5, 1)->nullable();
            $table->decimal('assignment', 5, 1)->nullable();
            $table->decimal('homework', 5, 1)->nullable();
            $table->string('remark')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['student_id', 'subject_id', 'academic_year', 'term'], 'student_subject_term_unique');
        });

        Schema::create('student_term_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('academic_year', 12);
            $table->unsignedTinyInteger('term');
            $table->text('teacher_comment')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['student_id', 'academic_year', 'term'], 'student_term_report_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_term_reports');
        Schema::dropIfExists('student_assessments');
        Schema::dropIfExists('subjects');
    }
};
