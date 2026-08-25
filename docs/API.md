# API notes

Base URL: `http://localhost:8000/api`

Authenticate with `Authorization: Bearer {token}` after `POST /auth/login`.

## Public

- `GET /health`
- `POST /auth/login` `{ email, password }`
- `POST /auth/register`

## Authenticated

- `GET /auth/me`
- `POST /auth/logout`
- `GET /dashboard`
- `GET /notifications`

## Staff and payroll (role-gated)

- `GET/POST /staff`, `PUT /staff/{id}`, `POST /staff/{id}/deactivate`
- `GET/POST /salary-grades`
- `GET /payroll-runs` — optional `?status=`
- `POST /payroll-runs` — generates slips (SSNIT, loans, absence; no PAYE) and scans anomalies
- `POST /payroll-runs/{id}/approve` — Headteacher; blocked if critical anomalies are open
- `POST /payroll-runs/{id}/paid`
- `GET /payrolls/{id}/payslip` — PDF
- `GET /anomalies/summary` — open counts by severity and rule
- `GET /anomalies` — filters: status, severity, rule_code, payroll_run_id, search
- `POST /payrolls/{id}/exclude` — drop a staff line from a **draft** run (payroll officer / Headteacher). Open flags on that line are closed.
- `POST /payrolls/{id}/restore` — put an excluded line back and rescan it
- `POST /payrolls/{id}/recalculate` — rebuild a draft slip from the current staff file and rescan that person
- `GET /anomalies` — HR can read the queue to edit or deactivate flagged staff; only payroll / Headteacher / auditor record outcomes
- `GET /reports/overview` — salary, flags and school roll snapshot
- `GET /reports/payroll`, `GET /reports/anomalies`
- `GET /audit-logs`
- `GET /leave-types` — catalogue, yearly days, remaining balance
- `GET/POST /leave-requests` — staff apply; HR reviews; Headteacher approves

Leave types: annual (28), casual (7 / max 3 per request), sick (30), maternity (84), paternity (5), compassionate (5), study (15 / max 10), official (10), unpaid (30).

## Parents and home–school messages

Roles: `super_admin`, `headteacher`, `hr_officer` manage the register. Teachers can view and send. Parents receive mail and in-app notices.

- `GET /parents` — parent accounts, linked wards, unlinked students, counts
- `POST /parents` — `{ first_name, last_name, email, phone?, password?, student_ids? }` (HR / Headteacher)
- `PUT /parents/{id}` — update file and ward links
- `GET /parent-messages` — recent notices (parents see only their own)
- `POST /parent-messages` — `{ type: notice|meeting|broadcast, subject, body, meeting_at?, meeting_venue?, parent_ids? }`

`broadcast` emails every active parent. `meeting` requires `meeting_at`. Mail uses the parent user’s registered email.
