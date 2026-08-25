<?php

return [
    'ssnit' => [
        'employee_rate' => 0.055,
        'employer_rate' => 0.13,
        'min_insurable' => 587.80,
        'max_insurable' => 69000.00,
    ],

    'anomaly' => [
        'high_salary_multiplier' => 1.5,
        'working_days_per_month' => 22,
        'daily_absence_penalty_rate' => 1 / 22,
    ],
];
