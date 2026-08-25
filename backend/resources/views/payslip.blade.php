<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payslip {{ $payroll->staff?->employee_id }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2933; }
        h1 { color: #0f6b3d; margin-bottom: 2px; font-size: 18px; }
        h2 { font-size: 13px; margin: 16px 0 6px; color: #0f6b3d; }
        .muted { color: #6b7280; }
        .box { border: 1px solid #d1d5db; padding: 10px 12px; margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
        .right { text-align: right; }
        .total { font-weight: bold; background: #f0fdf4; }
        .meta { width: 100%; }
        .meta td { border: 0; padding: 2px 0; }
    </style>
</head>
<body>
    <h1>School Management System</h1>
    <p class="muted">Monthly staff payslip · Ghana basic school</p>
    <table class="meta">
        <tr>
            <td>Staff: <strong>{{ $payroll->staff?->display_name ?: ($payroll->staff?->user?->name ?? $payroll->staff?->employee_id) }}</strong></td>
            <td class="right">Employee ID: <strong>{{ $payroll->staff?->employee_id }}</strong></td>
        </tr>
        <tr>
            <td>Department: {{ $payroll->staff?->department ?: '—' }} · {{ $payroll->staff?->job_title ?: $payroll->staff?->rank ?: 'Staff' }}</td>
            <td class="right">SSNIT: {{ $payroll->staff?->ssnit_number ?: '—' }}</td>
        </tr>
        <tr>
            <td>Period: {{ $payroll->payrollRun?->pay_period_start?->format('d M Y') }} – {{ $payroll->payrollRun?->pay_period_end?->format('d M Y') }}</td>
            <td class="right">Payment date: {{ $payroll->payment_date?->format('d M Y') }}</td>
        </tr>
    </table>

    <h2>Earnings</h2>
    <table>
        <tr><th>Description</th><th class="right">Amount (GHS)</th></tr>
        <tr><td>Basic salary</td><td class="right">{{ number_format($payroll->basic_salary, 2) }}</td></tr>
        <tr><td>Allowances</td><td class="right">{{ number_format($payroll->allowances, 2) }}</td></tr>
        <tr class="total"><td>Gross salary</td><td class="right">{{ number_format($payroll->gross_salary, 2) }}</td></tr>
    </table>

    <h2>Deductions</h2>
    <table>
        <tr><th>Description</th><th class="right">Amount (GHS)</th></tr>
        <tr><td>SSNIT employee (5.5%)</td><td class="right">{{ number_format($payroll->ssnit_contribution, 2) }}</td></tr>
        <tr><td>Staff loan recovery</td><td class="right">{{ number_format($payroll->loan_deductions, 2) }}</td></tr>
        <tr><td>Absence / unpaid days</td><td class="right">{{ number_format($payroll->absence_penalties, 2) }}</td></tr>
        <tr class="total"><td>Total deductions</td><td class="right">{{ number_format($payroll->deductions, 2) }}</td></tr>
        <tr class="total"><td>Net salary payable</td><td class="right">{{ number_format($payroll->net_salary, 2) }}</td></tr>
    </table>

    <p class="muted">
        Employer SSNIT (13%) is a school / GES contribution and is not taken from net pay:
        GHS {{ number_format($payroll->employer_ssnit, 2) }}.
        This school payroll does not deduct PAYE; income tax is not applied on this slip.
    </p>
    <p class="muted">
        Bank: {{ $payroll->staff?->bank_name ?: '—' }}
        · Account: {{ $payroll->staff?->bank_account ?: '—' }}
        · Run: {{ $payroll->payrollRun?->run_name }}
        · Status: {{ $payroll->payrollRun?->status }}
    </p>
</body>
</html>
