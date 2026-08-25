<?php

namespace Tests\Unit;

use App\Models\Staff;
use App\Services\PayrollCalculator;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollCalculatorTest extends TestCase
{
    use RefreshDatabase;

    public function test_ssnit_is_5_point_5_percent_of_basic(): void
    {
        $calc = new PayrollCalculator;
        $this->assertEquals(137.5, $calc->expectedSsnit(2500));
    }

    public function test_ssnit_is_capped_at_max_insurable(): void
    {
        $calc = new PayrollCalculator;
        $this->assertEquals(round(69000 * 0.055, 2), $calc->expectedSsnit(100000));
    }

    public function test_net_salary_excludes_paye_and_uses_ssnit_only(): void
    {
        $staff = Staff::query()->create([
            'employee_id' => 'EMP-CALC-01',
            'salary' => 2500,
            'status' => 'active',
        ]);

        $result = (new PayrollCalculator)->calculate(
            $staff,
            Carbon::parse('2026-08-01'),
            Carbon::parse('2026-08-31'),
            ['absence_penalties' => 0],
        );

        $this->assertEquals(137.5, $result['ssnit_contribution']);
        $this->assertEquals(0.0, $result['income_tax']);
        $this->assertEquals(0.0, $result['taxable_income']);
        $this->assertEquals(137.5, $result['deductions']);
        $this->assertEquals(2362.5, $result['net_salary']);
    }
}
