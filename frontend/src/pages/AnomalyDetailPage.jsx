import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowLeft } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { SeverityBadge } from './Dashboard'
import { evidenceRows, prettyStatus, ruleName } from '../data/anomalyRules'
import AnomalyFixActions from '../components/AnomalyFixActions'

const outcomes = [
  { id: 'acknowledged', label: 'Acknowledge', hint: 'Seen. Follow up with HR or attendance before the next pay day.' },
  { id: 'resolved', label: 'Resolve', hint: 'The underlying record is corrected. Safe to keep this staff on the run.' },
  { id: 'false_positive', label: 'False positive', hint: 'The rule fired, but the pay is legitimate. Record why.' },
]

function prettyDate(value) {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 16)
}

export default function AnomalyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canAct = hasRole('hr_officer', 'headteacher', 'auditor')
  const canFixStaff = hasRole('hr_officer')
  const [item, setItem] = useState(null)
  const [status, setStatus] = useState('resolved')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api.get(`/anomalies/${id}`).then(({ data }) => {
    setItem(data)
    if (data.status && data.status !== 'open') setStatus(data.status === 'open' ? 'resolved' : data.status)
    if (data.resolution_notes) setNotes(data.resolution_notes)
  })

  useEffect(() => { load() }, [id])

  const resolve = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post(`/anomalies/${id}/resolve`, { status, resolution_notes: notes })
      toast.success(status === 'resolved' ? 'Case resolved' : status === 'false_positive' ? 'Marked as false positive' : 'Case acknowledged')
      load()
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.errors?.resolution_notes?.[0] || 'Could not update')
    } finally {
      setBusy(false)
    }
  }

  if (!item) return <p className="text-slate-500">Loading investigation…</p>

  const staff = item.staff || {}
  const evidence = evidenceRows(item.evidence)
  const related = item.related || []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/anomalies" className="inline-flex items-center gap-2 text-sm text-emerald-800">
            <FiArrowLeft /> Anomaly desk
          </Link>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">{ruleName(item.rule_code)}</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">{item.title}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Detected {prettyDate(item.detected_at)} · {item.payroll_run?.run_name || 'Unlinked run'}
          </p>
        </div>
        <SeverityBadge value={item.severity} />
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Risk</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{Number(item.risk_score || 0).toFixed(0)}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-red-600" style={{ width: `${Math.min(100, Number(item.risk_score || 0))}%` }} />
          </div>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Confidence</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{Number(item.confidence_score || 0).toFixed(0)}%</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
          <p className="mt-1 text-lg font-semibold text-emerald-950">{prettyStatus(item.status)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Blocks approval?</p>
          <p className={`mt-1 text-lg font-semibold ${item.severity === 'critical' && item.status === 'open' ? 'text-red-700' : 'text-emerald-950'}`}>
            {item.severity === 'critical' && item.status === 'open' ? 'Yes — critical' : 'No'}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="card space-y-3">
            <h4 className="font-semibold text-emerald-950">What fired</h4>
            <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Recommended action</p>
              <p className="mt-1">{item.recommended_action}</p>
            </div>
          </section>

          <section className="card">
            <AnomalyFixActions item={item} onChanged={load} />
          </section>

          <section className="card space-y-3">
            <h4 className="font-semibold text-emerald-950">Staff on this flag</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Name</p>
                <p className="mt-1 font-medium">{staff.display_name || staff.employee_id || '—'}</p>
              </div>
              <div className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Employee ID</p>
                <p className="mt-1 font-medium">{staff.employee_id || '—'}</p>
              </div>
              <div className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Department</p>
                <p className="mt-1 font-medium">{staff.department || '—'}</p>
              </div>
              <div className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Net on this run</p>
                <p className="mt-1 font-medium">
                  {item.payroll?.net_salary != null
                    ? `GHS ${Number(item.payroll.net_salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.payroll_run_id && (
                <Link to={`/payroll/${item.payroll_run_id}`} className="text-sm text-emerald-800">Open salary run</Link>
              )}
              {canFixStaff && staff.id && (
                <Link to={`/staff/${staff.id}/edit`} className="text-sm text-emerald-800">Edit staff file</Link>
              )}
            </div>
          </section>

          <section className="card space-y-3">
            <h4 className="font-semibold text-emerald-950">Evidence</h4>
            {evidence.length ? (
              <dl className="grid gap-2 sm:grid-cols-2">
                {evidence.map((row) => (
                  <div key={row.key} className="flex justify-between gap-3 rounded-xl bg-stone-50 px-4 py-3 text-sm">
                    <dt className="capitalize text-slate-500">{row.label}</dt>
                    <dd className="font-medium text-emerald-950">{row.display}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-400">No structured evidence on this case.</p>
            )}
          </section>

          {!!related.length && (
            <section className="card space-y-3">
              <h4 className="font-semibold text-emerald-950">Related cases</h4>
              <p className="text-sm text-slate-500">Other flags on this staff member or the same salary run.</p>
              <div className="space-y-2">
                {related.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => navigate(`/anomalies/${row.id}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-3 text-left hover:border-emerald-300"
                  >
                    <span>
                      <span className="block text-sm font-medium text-emerald-950">{ruleName(row.rule_code)}</span>
                      <span className="text-xs text-slate-400">{prettyStatus(row.status)} · risk {Number(row.risk_score || 0).toFixed(0)}</span>
                    </span>
                    <SeverityBadge value={row.severity} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="card space-y-4 xl:sticky xl:top-6">
          <h4 className="font-semibold text-emerald-950">Investigation outcome</h4>
          {!canAct && canFixStaff && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              HR desk — correct the staff file or deactivate them using the steps on the left. Payroll records the investigation outcome after the record is fixed.
            </p>
          )}
          {!canAct && !canFixStaff && (
            <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
              Accountant view — you can read this case. Payroll, the Headteacher or the auditor records the outcome.
            </p>
          )}
          {item.resolver && (
            <p className="text-sm text-slate-500">
              Last update by {item.resolver.first_name} {item.resolver.last_name} on {prettyDate(item.resolved_at)}.
            </p>
          )}
          {canAct ? (
            <form className="space-y-3" onSubmit={resolve}>
              <div className="space-y-2">
                {outcomes.map((itemOutcome) => (
                  <button
                    key={itemOutcome.id}
                    type="button"
                    onClick={() => setStatus(itemOutcome.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left ${status === itemOutcome.id ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200'}`}
                  >
                    <p className="text-sm font-medium text-emerald-950">{itemOutcome.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{itemOutcome.hint}</p>
                  </button>
                ))}
              </div>
              <textarea
                className="input min-h-28"
                placeholder="What did you check? Attendance register, leave file, HR record…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? 'Saving…' : 'Save outcome'}
              </button>
            </form>
          ) : (
            item.resolution_notes && (
              <p className="rounded-xl bg-stone-50 p-3 text-sm text-slate-600">{item.resolution_notes}</p>
            )
          )}
          <p className="text-xs text-slate-400">
            Outcomes are written to the audit trail. Resolving a critical flag is what lets the Headteacher approve the run.
          </p>
        </aside>
      </div>
    </div>
  )
}
