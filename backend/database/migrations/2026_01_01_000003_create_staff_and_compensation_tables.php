<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_grades', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->decimal('basic_salary', 12, 2);
            $table->decimal('max_allowance_total', 12, 2)->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->string('employee_id')->unique();
            $table->string('department')->nullable();
            $table->string('job_title')->nullable();
            $table->decimal('salary', 12, 2)->default(0);
            $table->string('salary_type')->default('monthly');
            $table->string('bank_name')->nullable();
            $table->string('bank_account')->nullable();
            $table->string('ssnit_number')->nullable();
            $table->date('hire_date')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('allowance_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->boolean('is_taxable')->default(true);
            $table->boolean('requires_authorization')->default(true);
            $table->timestamps();
        });

        Schema::create('staff_allowances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->foreignId('allowance_type_id')->constrained('allowance_types')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->boolean('is_authorized')->default(true);
            $table->timestamps();
        });

        Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->string('reference')->nullable();
            $table->decimal('principal', 12, 2);
            $table->decimal('outstanding_balance', 12, 2);
            $table->decimal('monthly_deduction', 12, 2);
            $table->string('status')->default('active');
            $table->date('issued_on')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loans');
        Schema::dropIfExists('staff_allowances');
        Schema::dropIfExists('allowance_types');
        Schema::dropIfExists('staff');
        Schema::dropIfExists('salary_grades');
    }
};
