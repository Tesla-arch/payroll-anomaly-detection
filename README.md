# AI-Based Payroll Anomaly Detection System

School management system for Ghanaian basic schools with automated payroll (SSNIT, loans and absence) and an **explainable, rule-based anomaly engine**. Built as a final-year project: Laravel REST API + React SPA.

## What it does

- Staff, students, parent emails, attendance, and two-step leave approval (HR → Headteacher)
- Payroll runs using 5.5% employee SSNIT, staff loans and absence — no PAYE deduction
- Automatic scan after every payroll run
- Anomaly dashboard with evidence, risk score, narrative, and recommended action
- Payroll cannot be approved or marked paid while **critical** anomalies are still open

## Detection rules

| Code | What it catches |
| Ghost_No_User_Account | Salary without a linked user account |
| Ghost_Inactive_Staff | Inactive employee on a payroll run |
| Payment_Without_Attendance | Pay with no attendance (approved leave suppresses this) |
| Duplicate_Period_Payment | Two payments for the same period |
| Unusually_High_Salary | Gross pay above 1.5× grade/basic |
| Ssnit_Mismatch | Employee SSNIT not 5.5% of capped basic |
| Bank_Details_Missing | Missing bank name or account |
| Loan_Over_Deduction | Deduction above outstanding loan |
| Unauthorized_Allowance | Unauthorized or over-cap allowances |

## Requirements

- PHP 8.3+ (developed on PHP 8.5) and Composer
- Node.js 20+
- SQLite (default) or MySQL

## Quick start

**Backend**

```bash
cd backend
composer install
copy .env.example .env   # Windows
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

API: http://localhost:8000/api/health

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Demo accounts

Password for all accounts: `password`

| Email | Role |
| admin@school.gh | Super Admin |
| head@school.gh | Headteacher |
| hr@school.gh | HR Officer |
| payroll@school.gh | Payroll Officer |
| accounts@school.gh | Accountant |
| teacher@school.gh | Teacher |
| auditor@school.gh | Auditor |
| parent@school.gh | Parent |
| parent2@school.gh | Parent (Ama Owusu’s household) |

The seeder plants a July 2026 payroll run with deliberate anomalies so the dashboard is not empty.

## Tests

```bash
cd backend
php artisan test
```

Coverage includes auth/RBAC, staff uniqueness, Ghana payroll math, and a trigger + non-trigger case for every anomaly rule.

## Project layout

```
backend/    Laravel API (Sanctum tokens, services, PHPUnit)
frontend/   React + Vite + Tailwind
docs/       API, AI module, and user notes
```

## Ghana payroll config

Rates live in `backend/config/payroll.php` so they can be updated without rewriting code:

- Employee SSNIT 5.5%, employer 13%, 2026 insurable cap GHS 69,000
- School-level payroll does not deduct PAYE
