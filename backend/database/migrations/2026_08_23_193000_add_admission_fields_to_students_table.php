<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('middle_name')->nullable()->after('first_name');
            $table->string('place_of_birth')->nullable()->after('date_of_birth');
            $table->string('nationality')->nullable()->after('place_of_birth');
            $table->string('hometown')->nullable()->after('nationality');
            $table->string('region')->nullable()->after('hometown');
            $table->string('religion')->nullable()->after('region');
            $table->string('birth_certificate_number')->nullable()->after('religion');
            $table->string('previous_school')->nullable()->after('birth_certificate_number');
            $table->date('admission_date')->nullable()->after('previous_school');
            $table->string('digital_address')->nullable()->after('residential_address');
            $table->string('guardian_name')->nullable()->after('digital_address');
            $table->string('guardian_relationship')->nullable()->after('guardian_name');
            $table->string('guardian_occupation')->nullable()->after('guardian_relationship');
            $table->string('guardian_phone')->nullable()->after('guardian_occupation');
            $table->string('guardian_address')->nullable()->after('guardian_phone');
            $table->string('emergency_contact_name')->nullable()->after('guardian_address');
            $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_name');
            $table->string('blood_group')->nullable()->after('emergency_contact_phone');
            $table->string('nhis_number')->nullable()->after('blood_group');
            $table->string('allergies')->nullable()->after('nhis_number');
            $table->string('special_needs')->nullable()->after('allergies');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'middle_name', 'place_of_birth', 'nationality', 'hometown', 'region', 'religion',
                'birth_certificate_number', 'previous_school', 'admission_date', 'digital_address',
                'guardian_name', 'guardian_relationship', 'guardian_occupation', 'guardian_phone',
                'guardian_address', 'emergency_contact_name', 'emergency_contact_phone',
                'blood_group', 'nhis_number', 'allergies', 'special_needs',
            ]);
        });
    }
};
