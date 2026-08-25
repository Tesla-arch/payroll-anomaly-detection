<?php

namespace App\Services\Anomaly;

use App\Models\Payroll;
use App\Models\PayrollRun;

interface AnomalyRule
{
    public function detect(Payroll $payroll, PayrollRun $run): ?AnomalyDraft;
}
