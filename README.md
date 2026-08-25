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

## Open in your browser (GitHub Codespaces)

GitHub hosts the source at [Tesla-arch/payroll-anomaly-detection](https://github.com/Tesla-arch/payroll-anomaly-detection). The live app needs PHP and Node, so GitHub Pages cannot run it. Use **Codespaces** instead:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Tesla-arch/payroll-anomaly-detection?quickstart=1)

1. Open that badge (or on GitHub: **Code → Codespaces → Create codespace on main**)
2. Wait until the codespace finishes **setup** (first start can take several minutes; a 502 means the app is not running yet)
3. Open forwarded port **5173** — that is the school app
4. Sign in with a demo account below (password: `password`)

If port 5173 shows **HTTP ERROR 502**, the codespace is up but Vite is not. In the Codespace terminal run:

```bash
git pull origin main
bash .devcontainer/setup.sh
bash .devcontainer/start.sh
```

Then refresh the `…-5173.app.github.dev` tab. You can also start the two servers yourself:

```bash
cd backend && php artisan serve --host=0.0.0.0 --port=8000
```

```bash
cd frontend && npm run dev -- --host 0.0.0.0 --port 5173
```

The codespace sleeps after idle time. Create or restart it whenever you want to use the app in a browser.

## Deploy on Render (free)

Render can host the Laravel API and the React app from this GitHub repo as **one free web service**. PHP is not a native Render runtime, so the repo includes a `Dockerfile` and `render.yaml`.

**Limits of the free plan:** the site sleeps after 15 minutes idle (first load can take about a minute), SQLite data is wiped on sleep/redeploy and demo accounts are seeded again, and free instance hours are capped at 750/month.

1. Push `main` to [Tesla-arch/payroll-anomaly-detection](https://github.com/Tesla-arch/payroll-anomaly-detection)
2. Sign in at [dashboard.render.com](https://dashboard.render.com) with GitHub
3. **New → Blueprint** → pick this repository → apply `render.yaml`
4. Wait for the Docker build (several minutes the first time)
5. Open the `*.onrender.com` URL and sign in with a demo account below (`password`)

If you create the service manually instead: **New → Web Service** → this repo → **Docker** → instance type **Free** → health check path `/api/health`.

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
copy .env.example .env   # Windows; uses Vite’s /api proxy to Laravel
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
