# API notes

Base URL: `http://localhost:8000/api`

Authenticate with `Authorization: Bearer {token}` after `POST /auth/login`.

## Public

- `GET /users/summary` — totals by status and desk
- `GET /users` — filters: `role` (slug), `status`, `search`
- `GET/POST /users`, `GET/PUT /users/{id}` — Super Admin only
- `GET /roles`
- `POST /auth/login` `{ email, password }` — Administrators, Headteachers, HR, Auditors and Parents
- `POST /auth/login/staff` `{ employee_id, email }` — Teachers, Payroll Officers and Accountants (staff ID + employment email; no password)
- `GET /auth/register-roles` — desks allowed to self-register
- `GET /auth/captcha` — one-time SVG challenge for officer registration
- `POST /auth/register` `{ first_name, last_name, email, phone, password, password_confirmation, role, captcha_id, captcha }` — `role` is `super_admin`, `headteacher`, `hr_officer` or `auditor` only

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
- `GET /audit-logs` — filters: `module` (payroll, anomaly, staff, leave, parent, auth, user), `action`, `user_id`, `from`, `to`, `search`, `sensitive`
- `GET /audit-logs/summary` — counts by desk, action, actor and day
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

## Classrooms and class teachers

Roles: `headteacher`, `hr_officer`, `super_admin` assign teaching. Lower and Upper Primary keep one class teacher per room. Junior High teachers are assigned by subject and take JHS 1, 2 and 3 together.

- `GET /classes` — catalogue with `assignment_mode` (`classroom` or `subject`) and nested `teacher` on primary rooms
- `GET /classes/teachers` — active teaching staff, primary rooms they tutor, and JHS subjects they teach
- `PUT /classes/{id}/teacher` — `{ teacher_id }` (nullable to clear). Primary rooms only.
- `GET /classes/jhs-subjects` — Junior High subjects with the teacher who covers JHS 1–3
- `PUT /classes/jhs-subjects/{id}/teacher` — `{ teacher_id }` (nullable to clear). One teacher per subject.
- `POST /classes` — optional extra room (`hr_officer`, `teacher`, `super_admin`)
