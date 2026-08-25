import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const filters = [
  { id: 'all', label: 'All runs' },
  { id: 'draft', label: 'Awaiting approval' },
  { id: 'approved', label: 'Approved' },
  { id: 'paid', label: 'Paid' },
  { id: 'cancelled', label: 'Cancelled' },
]

const statusTone = {
  draft: 'bg-amber-50 text-amber-800',
  approved: 'bg-sky-50 text-sky-800',
  paid: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-stone-100 text-slate-500',
}

const roleDesk = {
  payroll_officer: 'You prepare the monthly salary list, generate the run, and mark it paid after the Headteacher signs.',
  headteacher: 'You review draft runs and approve them only when critical flags are cleared.',
  accountant: 'View-only desk. Check SSNIT, net pay and payment dates — you cannot generate or approve a run.',
  auditor: 'Inspect runs, flags and payment history. You cannot change payroll status.',
  super_admin: 'Full payroll desk — prepare, approve, pay or inspect any monthly run.',
}

function prettyDate(value) {
  return value ? String(value).slice(0, 10) : '—'
}

function ghs(value) {
  return `GHS ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PayrollPage() {
  const { role, hasRole } = useAuth()
  const navigate = useNavigate()
  const canPrepare = hasRole('payroll_officer')
  const [runs, setRuns] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const params = filter === 'all' ? {} : { status: filter }
    api.get('/payroll-runs', { params }).then(({ data }) => setRuns(data.data || data))
  }, [filter])

  const counts = useMemo(() => ({
    staff: runs.reduce((sum, run) => sum + (run.payrolls_count || run.total_staff || 0), 0),
    flags: runs.reduce((sum, run) => sum + (run.open_anomalies_count || 0), 0),
    net: runs.reduce((sum, run) => sum + Number(run.total_net || 0), 0),
  }), [runs])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Finance</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Monthly payroll</h3>
          <p className="mt-1 text-sm text-slate-500">
            Ghana basic school salary list — SSNIT, staff loans and absence. PAYE is not deducted on this desk.
          </p>
        </div>
        {canPrepare && (
          <Link to="/payroll/prepare" className="btn-primary inline-flex items-center gap-2">
            <FiPlus /> Prepare payroll
          </Link>
        )}
      </div>

      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950 ring-1 ring-emerald-100">
        {roleDesk[role] || roleDesk.accountant}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Runs in this list</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{runs.length}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Payslips / staff lines</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{counts.staff}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Net in this list</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{ghs(counts.net)}</p>
          {counts.flags > 0 && <p className="mt-1 text-xs text-amber-800">{counts.flags} open flags</p>}
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${filter === item.id ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Period</th>
                <th>Staff</th>
                <th>Net pay</th>
                <th>Status</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="cursor-pointer hover:bg-emerald-50/70"
                  onClick={() => navigate(`/payroll/${run.id}`)}
                >
                  <td>
                    <p className="font-medium">{run.run_name}</p>
                    <p className="text-xs text-slate-400">Pay day {prettyDate(run.payment_date)}</p>
                  </td>
                  <td>{prettyDate(run.pay_period_start)} – {prettyDate(run.pay_period_end)}</td>
                  <td>{run.payrolls_count ?? run.total_staff ?? '—'}</td>
                  <td className="font-medium">{ghs(run.total_net)}</td>
                  <td>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone[run.status] || 'bg-stone-100'}`}>
                      {run.status === 'draft' ? 'Awaiting approval' : run.status}
                    </span>
                  </td>
                  <td>
                    <span className={run.critical_anomalies_count ? 'font-medium text-red-700' : 'text-slate-600'}>
                      {run.open_anomalies_count ?? run.anomalies_count ?? 0}
                      {run.critical_anomalies_count ? ` · ${run.critical_anomalies_count} critical` : ''}
                    </span>
                  </td>
                </tr>
              ))}
              {!runs.length && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No payroll runs in this view.
                    {canPrepare && (
                      <>
                        {' '}
                        <Link to="/payroll/prepare" className="text-emerald-800">Prepare the next month</Link>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
