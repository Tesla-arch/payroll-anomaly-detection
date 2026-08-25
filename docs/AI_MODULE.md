# AI / anomaly module

The engine is **rule-based**, not a trained ML model. That is intentional: payroll fraud flags in a school must be explainable to a Headteacher and an auditor.

## How a scan works

1. A payroll run stores one `payrolls` row per staff member.
2. `PayrollAnomalyDetectionService` loads nine rule classes.
3. Each rule returns an `AnomalyDraft` or `null`.
4. `PayrollAnomalyInsightService` attaches a risk score (0–100), narrative, and recommended action.
5. Rows are stored in `payroll_anomalies` and reviewers are notified.

Rules live in `backend/app/Services/Anomaly/Rules/`. Adding a new rule means a new class plus two PHPUnit tests (trigger and non-trigger).

## Why leave matters

`Payment_Without_Attendance` does **not** fire when an approved leave request overlaps the pay period. That avoids punishing staff who were legitimately away.
