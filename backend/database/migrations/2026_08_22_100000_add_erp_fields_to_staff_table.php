<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->string('title')->nullable()->after('employee_id');
            $table->string('first_name')->nullable()->after('title');
            $table->string('middle_name')->nullable()->after('first_name');
            $table->string('last_name')->nullable()->after('middle_name');
            $table->string('gender')->nullable()->after('last_name');
            $table->date('date_of_birth')->nullable()->after('gender');
            $table->string('nationality')->nullable()->after('date_of_birth');
            $table->string('hometown')->nullable()->after('nationality');
            $table->string('region')->nullable()->after('hometown');
            $table->string('marital_status')->nullable()->after('region');
            $table->string('ghana_card_number')->nullable()->after('marital_status');
            $table->string('phone')->nullable()->after('ghana_card_number');
            $table->string('alternate_phone')->nullable()->after('phone');
            $table->string('email')->nullable()->after('alternate_phone');
            $table->string('residential_address')->nullable()->after('email');
            $table->string('digital_address')->nullable()->after('residential_address');
            $table->string('rank')->nullable()->after('job_title');
            $table->string('employment_type')->nullable()->after('rank');
            $table->date('first_appointment_date')->nullable()->after('employment_type');
            $table->date('assumption_date')->nullable()->after('first_appointment_date');
            $table->string('current_posting')->nullable()->after('assumption_date');
            $table->string('highest_qualification')->nullable()->after('current_posting');
            $table->string('professional_qualification')->nullable()->after('highest_qualification');
            $table->string('subject_specialization')->nullable()->after('professional_qualification');
            $table->string('ntc_number')->nullable()->after('subject_specialization');
            $table->unsignedSmallInteger('years_of_experience')->nullable()->after('ntc_number');
            $table->string('tin')->nullable()->after('ssnit_number');
            $table->string('bank_branch')->nullable()->after('bank_name');
            $table->string('account_name')->nullable()->after('bank_account');
            $table->string('next_of_kin_name')->nullable()->after('status');
            $table->string('next_of_kin_relationship')->nullable()->after('next_of_kin_name');
            $table->string('next_of_kin_phone')->nullable()->after('next_of_kin_relationship');
        });
    }

    public function down(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            $table->dropColumn([
                'title', 'first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth',
                'nationality', 'hometown', 'region', 'marital_status', 'ghana_card_number',
                'phone', 'alternate_phone', 'email', 'residential_address', 'digital_address',
                'rank', 'employment_type', 'first_appointment_date', 'assumption_date',
                'current_posting', 'highest_qualification', 'professional_qualification',
                'subject_specialization', 'ntc_number', 'years_of_experience', 'tin',
                'bank_branch', 'account_name', 'next_of_kin_name', 'next_of_kin_relationship',
                'next_of_kin_phone',
            ]);
        });
    }
};
