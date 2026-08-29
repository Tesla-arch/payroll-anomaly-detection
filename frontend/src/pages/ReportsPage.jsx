import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiDownload, FiRefreshCw } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ruleName, severityMeta, prettyStatus } from '../data/anomalyRules'

const tabs = [
  { id: 'salary', label: 'Salary' },
  { id: 'flags', label: 'Flags' },
  { id: 'school', label: 'School' },
]

const chartMetrics = [
  { id: 'total_net', label: 'Net pay', money: true },
  { id: 'total_gross', label: 'Gross', money: true },
  { id: 'ssnit', label: 'SSNIT 5.5%', money: true },
  { id: 'open_anomalies_count', label: 'Open flags', money: false },
]

const statusTone = {
  draft: 'bg-amber-50 text-amber-800',
  approved: 'bg-sky-50 text-sky-800',
  paid: 'tone-success',
  cancelled: 'bg-stone-100 text-slate-500',
}

const roleDesk = {
  payroll_officer: 'Compare months, SSNIT and net payable before you prepare the next salary run.',
  headteacher: 'Check critical flags against net pay before you approve a draft run.',
  accountant: 'Use SSNIT employee / employer totals and net payable for the school books. This desk is view-only.',
  auditor: 'Track open versus closed flags across salary runs. You cannot change payroll from here.',
  super_admin: 'School-wide salary, flag and roll snapshot for Ghana basic schools.',
}

function prettyDate(value) {
  return value ? String(value).slice(0, 10) : '—'
}

function ghs(value) {
  return `GHS ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function runStatus(status) {
  return status === 'draft' ? 'Awaiting approval' : (status || '—')
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

function vsPrevious(current, previous, money) {
  if (previous == null) return null
  const diff = Number(current || 0) - Number(previous || 0)
  if (Math.abs(diff) < 0.005) return 'Same as the previous listed run'
  const pct = Number(previous) ? (diff / Number(previous)) * 100 : 0
  const amount = money ? ghs(Math.abs(diff)) : Math.abs(diff).toLocaleString()
  return `${diff >= 0 ? '+' : '−'}${amount} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%) vs previous listed run`
}

function Delta({ current, previous, money = false }) {
  const text = vsPrevious(current, previous, money)
  if (!text) return <p className="mt-1 text-xs text-slate-400">No earlier run in this list</p>
  const down = Number(current || 0) < Number(previous || 0)
  return <p className={`mt-1 text-xs ${down ? 'text-slate-500' : 'text-emerald-800'}`}>{text}</p>
}

function KpiLink({ to, label, value, hint, tone = 'default' }) {
  return (
    <Link to={to} className={`card block text-inherit no-underline transition hover:-translate-y-0.5 hover:ring-emerald-400 ${tone === 'danger' ? 'ring-red-100 hover:ring-red-300' : ''}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === 'danger' ? 'text-red-700' : 'text-emerald-950'}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </Link>
  )
}

export default function ReportsPage() {
  const { role, hasRole } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = tabs.some((item) => item.id === params.get('tab')) ? params.get('tab') : 'salary'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [chartMetric, setChartMetric] = useState('total_net')
  const [runQuery, setRunQuery] = useState('')
  const [dept, setDept] = useState(null)

  const load = () => {
    setLoading(true)
    setError('')
    api.get('/reports/overview')
      .then(({ data: payload }) => {
        setData(payload)
        setSelectedId((current) => current || payload.payroll?.runs?.[0]?.id || null)
        setDept((current) => current || payload.school?.by_department?.[0]?.department || null)
      })
      .catch(() => setError('Could not load the school snapshot. Try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const runs = data?.payroll?.runs || []
  const totals = data?.payroll?.totals || {}
  const anomalies = data?.anomalies || {}
  const school = data?.school || {}
  const listedRuns = useMemo(() => {
    const q = runQuery.trim().toLowerCase()
    if (!q) return runs
    return runs.filter((run) => `${run.run_name} ${run.status} ${prettyDate(run.pay_period_start)}`.toLowerCase().includes(q))
  }, [runs, runQuery])
  const selected = listedRuns.find((run) => run.id === selectedId) || listedRuns[0] || runs.find((run) => run.id === selectedId) || runs[0]
  const selectedIndex = runs.findIndex((run) => run.id === selected?.id)
  const previous = selectedIndex >= 0 ? runs[selectedIndex + 1] : null
  const metric = chartMetrics.find((item) => item.id === chartMetric) || chartMetrics[0]
  const maxChart = Math.max(1, ...listedRuns.map((run) => Number(run[metric.id] || 0)))
  const maxDept = Math.max(1, ...(school.by_department || []).map((row) => Number(row.total || 0)))
  const maxRule = Math.max(1, ...(anomalies.openByRule || []).map((row) => Number(row.total || 0)))
  const selectedDept = (school.by_department || []).find((row) => row.department === dept) || (school.by_department || [])[0]
  const attendance = school.attendance_today || {}
  const unmarked = Math.max(0, Number(school.active_staff || 0) - Number(attendance.marked || 0))
  const attendanceParts = [
    { key: 'present', label: 'Present', value: Number(attendance.present || 0), color: 'tone-success-solid' },
    { key: 'absent', label: 'Absent', value: Number(attendance.absent || 0), color: 'bg-red-600' },
    { key: 'on_leave', label: 'On leave', value: Number(attendance.on_leave || 0), color: 'bg-sky-600' },
    { key: 'unmarked', label: 'Unmarked', value: unmarked, color: 'bg-stone-300' },
  ]
  const attendanceTotal = Math.max(1, attendanceParts.reduce((sum, part) => sum + part.value, 0))

  const severityDonut = useMemo(() => {
    const source = anomalies.bySeverity || []
    const parts = ['critical', 'high', 'medium', 'low'].map((key) => ({
      key,
      value: Number(source.find((row) => row.severity === key)?.total || 0),
      ...severityMeta[key],
    }))
    const total = parts.reduce((sum, part) => sum + part.value, 0)
    let offset = 0
    return {
      total,
      slices: parts.map((part) => {
        const length = ((part.value / (total || 1)) * 100)
        const slice = { ...part, length, offset }
        offset += length
        return slice
      }),
    }
  }, [anomalies.bySeverity])

  const setTab = (id) => {
    const next = new URLSearchParams(params)
    next.set('tab', id)
    setParams(next, { replace: true })
  }

  const exportTab = () => {
    if (tab === 'salary') {
      downloadCsv('sms-salary-report.csv', [
        ['Run', 'Period start', 'Period end', 'Status', 'Staff', 'Basic', 'Allowances', 'Gross', 'SSNIT employee', 'Employer SSNIT', 'Loans', 'Absence', 'Net', 'Open flags', 'Critical flags'],
        ...runs.map((run) => [
          run.run_name,
          prettyDate(run.pay_period_start),
          prettyDate(run.pay_period_end),
          runStatus(run.status),
          run.total_staff,
          run.basic,
          run.allowances,
          run.total_gross,
          run.ssnit,
          run.employer_ssnit,
          run.loans,
          run.absence,
          run.total_net,
          run.open_anomalies_count,
          run.critical_anomalies_count,
        ]),
      ])
      return
    }
    if (tab === 'flags') {
      downloadCsv('sms-anomaly-report.csv', [
        ['Metric', 'Value'],
        ['Open', anomalies.open],
        ['Critical open', anomalies.critical_open],
        ['Closed', anomalies.closed],
        [],
        ['Severity', 'Total'],
        ...(anomalies.bySeverity || []).map((row) => [row.severity, row.total]),
        [],
        ['Open by rule', 'Total'],
        ...(anomalies.openByRule || []).map((row) => [ruleName(row.rule_code), row.total]),
        [],
        ['Status', 'Total'],
        ...(anomalies.byStatus || []).map((row) => [prettyStatus(row.status), row.total]),
      ])
      return
    }
    downloadCsv('sms-school-roll.csv', [
      ['Metric', 'Value'],
      ['Active staff', school.active_staff],
      ['Inactive staff', school.inactive_staff],
      ['Pupils', school.students],
      ['Classes', school.classes],
      ['Pending leave', school.pending_leave],
      ['Approved leave this year', school.approved_leave],
      ['Marked today', attendance.marked],
      ['Present today', attendance.present],
      ['Absent today', attendance.absent],
      ['On leave today', attendance.on_leave],
      [],
      ['Department', 'Active staff'],
      ...(school.by_department || []).map((row) => [row.department, row.total]),
    ])
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-2xl bg-stone-100" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-stone-100" />)}
        </div>
        <div className="h-52 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="card space-y-3">
        <h3 className="text-lg font-semibold text-emerald-950">School reports</h3>
        <p className="text-sm text-slate-500">{error}</p>
        <button type="button" className="btn-primary w-fit" onClick={load}>Try again</button>
      </div>
    )
  }

  const grossParts = selected ? [
    { label: 'Net', value: Number(selected.total_net || 0), color: 'bg-emerald-700' },
    { label: 'SSNIT', value: Number(selected.ssnit || 0), color: 'bg-sky-600' },
    { label: 'Loans', value: Number(selected.loans || 0), color: 'bg-amber-500' },
    { label: 'Absence', value: Number(selected.absence || 0), color: 'bg-rose-500' },
  ] : []
  const grossTotal = Math.max(1, grossParts.reduce((sum, part) => sum + part.value, 0))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Management information</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">School reports</h3>
          <p className="mt-1 text-sm text-slate-500">
            Interactive snapshot of salary runs, payroll flags and the basic-school roll. PAYE is not part of this payroll.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50" onClick={load}>
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={exportTab}>
            <FiDownload /> Download CSV
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950 ring-1 ring-emerald-100">
        {roleDesk[role] || roleDesk.accountant}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const hint = item.id === 'salary'
            ? `${runs.length} run${runs.length === 1 ? '' : 's'}`
            : item.id === 'flags'
              ? `${anomalies.open || 0} open`
              : `${school.active_staff || 0} staff`
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ${tab === item.id ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
            >
              {item.label}
              <span className={`ml-2 text-xs ${tab === item.id ? 'text-emerald-100' : 'text-slate-400'}`}>{hint}</span>
            </button>
          )
        })}
      </div>

      {tab === 'salary' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-slate-400">Gross (listed runs)</p>
              <p className="mt-1 text-xl font-semibold text-emerald-950">{ghs(totals.gross)}</p>
              <p className="mt-1 text-xs text-slate-400">{totals.runs || 0} run{(totals.runs || 0) === 1 ? '' : 's'} · {totals.staff || 0} staff lines</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-slate-400">SSNIT employee</p>
              <p className="mt-1 text-xl font-semibold text-emerald-950">{ghs(totals.ssnit)}</p>
              <p className="mt-1 text-xs text-slate-400">Employer 13% {ghs(totals.employer_ssnit)}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-slate-400">Loans + absence</p>
              <p className="mt-1 text-xl font-semibold text-emerald-950">{ghs((totals.loans || 0) + (totals.absence || 0))}</p>
              <p className="mt-1 text-xs text-slate-400">Loans {ghs(totals.loans)} · absence {ghs(totals.absence)}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-slate-400">Net payable</p>
              <p className="mt-1 text-xl font-semibold text-emerald-950">{ghs(totals.net)}</p>
              <p className="mt-1 text-xs text-slate-400">PAYE is not deducted</p>
            </div>
          </div>

          <div className="card">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="font-semibold text-emerald-950">{metric.label} by run</h4>
                <p className="mt-1 text-sm text-slate-500">Click a bar or a row to inspect that month. Switch the metric to compare gross, SSNIT or flags.</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {chartMetrics.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setChartMetric(item.id)}
                    className={`rounded-full px-3 py-1 text-xs ${chartMetric === item.id ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex h-44 items-end gap-2">
              {listedRuns.map((run) => {
                const value = Number(run[metric.id] || 0)
                const active = selected?.id === run.id
                return (
                  <button
                    key={run.id}
                    type="button"
                    title={`${run.run_name}: ${metric.money ? ghs(value) : value}`}
                    onClick={() => setSelectedId(run.id)}
                    className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                  >
                    <span className={`mb-1 truncate text-center text-[10px] font-medium ${active ? 'text-emerald-900' : 'text-transparent group-hover:text-slate-600'}`}>
                      {metric.money ? ghs(value).replace('GHS ', '') : value}
                    </span>
                    <div
                      className={`w-full rounded-t-lg transition ${active ? 'bg-emerald-800' : run.critical_anomalies_count ? 'bg-red-300 group-hover:bg-red-400' : 'bg-emerald-300 group-hover:bg-emerald-500'}`}
                      style={{ height: `${Math.max(8, (value / maxChart) * 100)}%` }}
                    />
                    <span className="mt-2 truncate text-[10px] text-slate-500">{prettyDate(run.pay_period_start).slice(0, 7)}</span>
                  </button>
                )
              })}
              {!listedRuns.length && <p className="text-sm text-slate-400">{runs.length ? 'No runs match that search.' : 'No salary runs yet.'}</p>}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="card min-w-0 xl:col-span-2 overflow-x-auto">
              <div className="mb-3">
                <input
                  className="input w-full max-w-sm"
                  placeholder="Filter by run name, month or status"
                  value={runQuery}
                  onChange={(e) => setRunQuery(e.target.value)}
                />
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Status</th>
                    <th>Staff</th>
                    <th>Gross</th>
                    <th>SSNIT</th>
                    <th>Net</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {listedRuns.map((run) => (
                    <tr
                      key={run.id}
                      className={`cursor-pointer ${selected?.id === run.id ? 'bg-emerald-50' : 'hover:bg-stone-50'}`}
                      onClick={() => setSelectedId(run.id)}
                    >
                      <td>
                        <p className="font-medium">{run.run_name}</p>
                        <p className="text-xs text-slate-400">{prettyDate(run.pay_period_start)} – {prettyDate(run.pay_period_end)}</p>
                      </td>
                      <td>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone[run.status] || 'bg-stone-100'}`}>
                          {runStatus(run.status)}
                        </span>
                      </td>
                      <td>{run.total_staff}</td>
                      <td>{ghs(run.total_gross)}</td>
                      <td>{ghs(run.ssnit)}</td>
                      <td className="font-medium">{ghs(run.total_net)}</td>
                      <td className={run.critical_anomalies_count ? 'font-medium text-red-700' : ''}>
                        {run.open_anomalies_count || 0}
                        {run.critical_anomalies_count ? ` · ${run.critical_anomalies_count} critical` : ''}
                      </td>
                    </tr>
                  ))}
                  {!listedRuns.length && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No salary runs to list.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <aside className="card space-y-3">
              {selected ? (
                <>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Selected run</p>
                  <h4 className="font-semibold text-emerald-950">{selected.run_name}</h4>
                  <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone[selected.status] || 'bg-stone-100'}`}>
                    {runStatus(selected.status)}
                  </span>
                  <div>
                    <p className="text-2xl font-semibold text-emerald-950">{ghs(selected.total_net)}</p>
                    <Delta current={selected.total_net} previous={previous?.total_net} money />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Where the gross went</p>
                  <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
                    {grossParts.map((part) => (
                      <div key={part.label} className={part.color} style={{ width: `${(part.value / grossTotal) * 100}%` }} title={`${part.label}: ${ghs(part.value)}`} />
                    ))}
                  </div>
                  <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    {grossParts.map((part) => (
                      <li key={part.label} className="flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${part.color}`} />
                        {part.label} {ghs(part.value)}
                      </li>
                    ))}
                  </ul>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between"><dt className="text-slate-500">Basic</dt><dd>{ghs(selected.basic)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Allowances</dt><dd>{ghs(selected.allowances)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Employer 13%</dt><dd>{ghs(selected.employer_ssnit)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Open flags</dt><dd className={selected.critical_anomalies_count ? 'font-medium text-red-700' : ''}>{selected.open_anomalies_count || 0}{selected.critical_anomalies_count ? ` · ${selected.critical_anomalies_count} critical` : ''}</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link to={`/payroll/${selected.id}`} className="btn-primary">Open run</Link>
                    <Link to={`/anomalies?run=${selected.id}&status=open`} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
                      Open flags
                    </Link>
                    {hasRole('payroll_officer') && (
                      <Link to="/payroll/prepare" className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Prepare next</Link>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">Select a salary run.</p>
              )}
            </aside>
          </div>
        </div>
      )}

      {tab === 'flags' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiLink to="/anomalies?status=open" label="Open flags" value={anomalies.open ?? 0} hint="Go to the investigation desk" />
            <KpiLink to="/anomalies?status=open&severity=critical" label="Critical open" value={anomalies.critical_open ?? 0} hint="These block Headteacher approval" tone="danger" />
            <KpiLink to="/anomalies?status=resolved" label="Closed" value={anomalies.closed ?? 0} hint="Resolved or false positive" />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="card">
              <h4 className="font-semibold text-emerald-950">All flags by severity</h4>
              <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
                <div className="relative">
                  <svg viewBox="0 0 42 42" className="h-28 w-28 -rotate-90">
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    {severityDonut.slices.map((slice) => (
                      <circle
                        key={slice.key}
                        cx="21"
                        cy="21"
                        r="15.9"
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="6"
                        strokeDasharray={`${slice.length} ${100 - slice.length}`}
                        strokeDashoffset={-slice.offset}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex rotate-0 flex-col items-center justify-center text-center">
                    <p className="text-lg font-semibold text-emerald-950">{severityDonut.total}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">all cases</p>
                  </div>
                </div>
                <ul className="flex-1 space-y-1 text-sm">
                  {severityDonut.slices.map((slice) => (
                    <li key={slice.key}>
                      <Link to={`/anomalies?status=open&severity=${slice.key}`} className="flex items-center justify-between rounded-lg px-2 py-1 capitalize hover:bg-stone-50 hover:text-emerald-800">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                          {slice.label}
                        </span>
                        {slice.value}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="card xl:col-span-2">
              <h4 className="font-semibold text-emerald-950">Open flags by rule</h4>
              <p className="mt-1 text-sm text-slate-500">Click a bar to open that queue on the investigation desk.</p>
              <ul className="mt-4 space-y-2">
                {(anomalies.openByRule || []).map((row) => (
                  <li key={row.rule_code}>
                    <Link to={`/anomalies?status=open&rule=${row.rule_code}`} className="block rounded-lg p-1 hover:bg-stone-50">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{ruleName(row.rule_code)}</span>
                        <strong>{row.total}</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-emerald-700" style={{ width: `${(Number(row.total) / maxRule) * 100}%` }} />
                      </div>
                    </Link>
                  </li>
                ))}
                {!(anomalies.openByRule || []).length && <p className="text-sm text-slate-400">No open flags.</p>}
              </ul>
            </div>
          </div>

          <div className="card">
            <h4 className="font-semibold text-emerald-950">Case status</h4>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(anomalies.byStatus || []).map((row) => (
                <Link key={row.status} to={`/anomalies?status=${row.status}`} className="rounded-xl bg-stone-50 px-4 py-3 transition hover:bg-emerald-50 hover:ring-1 hover:ring-emerald-200">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{prettyStatus(row.status)}</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-950">{row.total}</p>
                </Link>
              ))}
              {!(anomalies.byStatus || []).length && <p className="text-sm text-slate-400">No flags recorded yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'school' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiLink to="/staff" label="Active staff" value={school.active_staff ?? 0} hint={`${school.inactive_staff ?? 0} inactive`} />
            <KpiLink to="/students" label="Pupils" value={school.students ?? 0} hint={`${school.classes ?? 0} classes`} />
            <KpiLink to="/leave" label="Leave queue" value={school.pending_leave ?? 0} hint={`${school.approved_leave ?? 0} approved this year`} />
            <KpiLink to="/attendance" label="Staff marked today" value={attendance.marked ?? 0} hint={`${attendance.present ?? 0} present · ${attendance.absent ?? 0} absent · ${attendance.on_leave ?? 0} on leave`} />
          </div>

          <div className="card">
            <h4 className="font-semibold text-emerald-950">Today’s attendance mix</h4>
            <p className="mt-1 text-sm text-slate-500">Against the active staff roll. Unmarked names still need a present, late, absent or leave mark.</p>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-stone-100">
              {attendanceParts.map((part) => (
                <div key={part.key} className={part.color} style={{ width: `${(part.value / attendanceTotal) * 100}%` }} title={`${part.label}: ${part.value}`} />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {attendanceParts.map((part) => (
                <li key={part.key} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${part.color}`} />
                  {part.label} <strong>{part.value}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="card xl:col-span-2">
              <h4 className="font-semibold text-emerald-950">Active staff by department</h4>
              <p className="mt-1 text-sm text-slate-500">Click a posting to inspect it, then open the staff register for that unit.</p>
              <ul className="mt-4 space-y-2">
                {(school.by_department || []).map((row) => (
                  <li key={row.department}>
                    <button type="button" className="w-full rounded-lg p-1 text-left hover:bg-stone-50" onClick={() => setDept(row.department)}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className={selectedDept?.department === row.department ? 'font-medium text-emerald-900' : ''}>{row.department}</span>
                        <strong>{row.total}</strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                        <div className={`h-full rounded-full ${selectedDept?.department === row.department ? 'bg-emerald-800' : 'bg-emerald-500'}`} style={{ width: `${(Number(row.total) / maxDept) * 100}%` }} />
                      </div>
                    </button>
                  </li>
                ))}
                {!(school.by_department || []).length && <p className="text-sm text-slate-400">No active staff on the register.</p>}
              </ul>
            </div>
            <aside className="card space-y-3">
              {selectedDept ? (
                <>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Selected posting</p>
                  <h4 className="font-semibold text-emerald-950">{selectedDept.department}</h4>
                  <p className="text-3xl font-semibold text-emerald-950">{selectedDept.total}</p>
                  <p className="text-sm text-slate-500">
                    {school.active_staff ? `${((Number(selectedDept.total) / Number(school.active_staff)) * 100).toFixed(0)}% of active staff` : 'Share of the active roll'}
                  </p>
                  <Link to={`/staff?q=${encodeURIComponent(selectedDept.department === 'Unassigned' ? '' : selectedDept.department)}`} className="btn-primary inline-flex w-fit">
                    Open staff register
                  </Link>
                </>
              ) : (
                <p className="text-sm text-slate-400">Select a department.</p>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
