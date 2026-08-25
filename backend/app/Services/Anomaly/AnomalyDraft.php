<?php

namespace App\Services\Anomaly;

class AnomalyDraft
{
    public function __construct(
        public string $ruleCode,
        public string $category,
        public string $severity,
        public string $title,
        public string $description,
        public array $evidence,
        public float $confidenceScore,
    ) {}
}
