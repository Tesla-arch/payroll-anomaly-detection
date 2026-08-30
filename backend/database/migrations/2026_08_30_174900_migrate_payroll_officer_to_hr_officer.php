<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $payroll = DB::table('roles')->where('slug', 'payroll_officer')->first();
        $hr = DB::table('roles')->where('slug', 'hr_officer')->first();

        if (! $payroll || ! $hr) {
            return;
        }

        DB::table('users')
            ->where('role_id', $payroll->id)
            ->update(['role_id' => $hr->id]);

        DB::table('staff')
            ->where('job_title', 'Payroll Officer')
            ->update(['job_title' => 'HR Officer']);

        DB::table('roles')->where('id', $payroll->id)->delete();
    }

    public function down(): void
    {
        if (DB::table('roles')->where('slug', 'payroll_officer')->exists()) {
            return;
        }

        DB::table('roles')->insert([
            'name' => 'Payroll Officer',
            'slug' => 'payroll_officer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
