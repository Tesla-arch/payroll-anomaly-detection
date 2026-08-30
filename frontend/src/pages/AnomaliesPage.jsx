import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiAlertTriangle, FiSearch } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { SeverityBadge } from './Dashboard'
import { evidenceRows, prettyStatus, ruleName, severityMeta } from '../data/anomalyRules'
import AnomalyFixActions from '../components/AnomalyFixActions'

const statusFilters = [
  { id: 'open', label: 'Open' },
  { id: 'acknowledged', label: 'Acknowledged' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'false_positive', label: 'False positive' },
  { id: 'all', label: 'All cases' },
]

const roleDesk = {
  hr_officer: 'Prepare salary runs, correct staff files, and clear open flags before the Headteacher approves payment.',
  headteacher: 'Review critical and high flags. Resolve or send back to HR with notes before you approve payroll.',
  auditor: 'Inspect evidence and outcomes. You can resolve or mark a false positive; you cannot generate payroll.',
  accountant: 'View-only desk. You can read cases and evidence but cannot change their status.',
  super_admin: 'Full investigation desk — filter, preview, acknowledge or resolve any payroll flag.',
}

export default function AnomaliesPage() {
  const { role, hasRole } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const canAct = hasRole('hr_officer', 'headteacher', 'auditor')
  const canRescan = hasRole('hr_officer')

  const status = params.get('status') || 'open'
  const severity = params.get('severity') || ''
  const rule = params.get('rule') || ''
  const runId = params.get('run') || ''
  const search = params.get('q') || ''

  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState(search)
  const [busy, setBusy] = useState('')

  const setFilter = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => {
      if (value === '' || value == null) next.delete(key)
      else next.set(key, value)
    })
    setParams(next, { replace: true })
  }

  const load = () => {
    api.get('/anomalies', {
      params: {
        status: status || 'open',
        severity: severity || undefined,
        rule_code: rule || undefined,
        payroll_run_id: runId || undefined,
        search: search || undefined,
        per_page: 60,
      },
    }).then(({ data }) => {
      const list = data.data || data
      setRows(list)
      setSelectedId((current) => (list.some((row) => row.id === current) ? current : list[0]?.id || null))
    })
  }

  useEffect(() => { load() }, [status, severity, rule, runId, search])
  useEffect(() => {
    api.get('/anomalies/summary').then(({ data }) => setSummary(data)).catch(() => {})
  }, [])

  const selected = rows.find((row) => row.id === selectedId) || rows[0]
  const openBySeverity = summary?.by_severity || {}
  const rules = summary?.by_rule || []

  const donut = useMemo(() => {
    const parts = ['critical', 'high', 'medium', 'low'].map((key) => ({
      key,
      value: Number(openBySeverity[key] || 0),
      ...severityMeta[key],
    }))
    const total = parts.reduce((sum, part) => sum + part.value, 0) || 1
    let offset = 0
    return parts.map((part) => {
      const length = (part.value / total) * 100
      const slice = { ...part, length, offset }
      offset += length
      return slice
    })
  }, [openBySeverity])

  const acknowledge = async (id) => {
    setBusy(`ack-${id}`)
    try {
      await api.post(`/anomalies/${id}/resolve`, {
        status: 'acknowledged',
        resolution_notes: 'Acknowledged from the investigation desk for follow-up.',
      })
      toast.success('Case acknowledged')
      load()
      api.get('/anomalies/summary').then(({ data }) => setSummary(data))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not acknowledge')
    } finally {
      setBusy('')
    }
  }

  const rescan = async (id) => {
    if (!id) return
    setBusy(`scan-${id}`)
    try {
      const { data } = await api.post(`/payroll-runs/${id}/rescan`)
      toast.success(`${data.detected} flag${data.detected === 1 ? '' : 's'} after rescan`)
      load()
      api.get('/anomalies/summary').then(({ data: next }) => setSummary(next))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Rescan failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Investigation</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Payroll anomaly desk</h3>
          <p className="mt-1 text-sm text-slate-500">
            Explainable flags from each salary run. Critical cases must be cleared before the Headteacher can approve pay.
          </p>
        </div>
        <div className="relative w-full max-w-sm">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search staff, rule or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setFilter({ q: query })}
            onBlur={() => setFilter({ q: query })}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950 ring-1 ring-emerald-100">
        {roleDesk[role] || roleDesk.accountant}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Open', summary?.open ?? '—', () => setFilter({ status: 'open', severity: '' }), status === 'open' && !severity],
          ['Critical', summary?.critical_open ?? '—', () => setFilter({ status: 'open', severity: 'critical' }), severity === 'critical', true],
          ['High', summary?.high_open ?? '—', () => setFilter({ status: 'open', severity: 'high' }), severity === 'high'],
          ['Closed', summary?.resolved ?? '—', () => setFilter({ status: 'resolved', severity: '' }), status === 'resolved'],
        ].map(([label, value, onClick, active, danger]) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={`card text-left transition hover:-translate-y-0.5 ${active ? 'ring-2 ring-emerald-700' : ''} ${danger ? 'ring-red-200' : ''}`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${danger ? 'text-red-700' : 'text-emerald-950'}`}>{value}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card space-y-4">
          <h4 className="font-semibold text-emerald-950">Open by severity</h4>
          <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
            <svg viewBox="0 0 42 42" className="h-28 w-28 -rotate-90">
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="6" />
              {donut.map((slice) => (
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
                  className="cursor-pointer"
                  onClick={() => setFilter({ status: 'open', severity: severity === slice.key ? '' : slice.key })}
                />
              ))}
            </svg>
            <ul className="flex-1 space-y-1 text-sm">
              {donut.map((slice) => (
                <li key={slice.key}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1 capitalize ${severity === slice.key ? 'bg-stone-100 font-medium' : ''}`}
                    onClick={() => setFilter({ status: 'open', severity: severity === slice.key ? '' : slice.key })}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                      {slice.key}
                    </span>
                    {slice.value}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Open by rule</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rules.map((item) => (
                <button
                  key={item.rule_code}
                  type="button"
                  onClick={() => setFilter({ rule: rule === item.rule_code ? '' : item.rule_code, status: 'open' })}
                  className={`rounded-full px-3 py-1 text-xs ${rule === item.rule_code ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
                >
                  {ruleName(item.rule_code)} · {item.total}
                </button>
              ))}
              {!rules.length && <p className="text-sm text-slate-400">No open flags.</p>}
            </div>
          </div>
        </div>

        <div className="card xl:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter({ status: item.id })}
                className={`rounded-full px-3 py-1.5 text-sm ${status === item.id ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {(summary?.runs || []).length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select className="input max-w-xs" value={runId} onChange={(e) => setFilter({ run: e.target.value })}>
                <option value="">All salary runs</option>
                {(summary.runs || []).map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.run_name} · {run.open_anomalies_count || 0} open
                  </option>
                ))}
              </select>
              {canRescan && (
                <button
                  type="button"
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-50"
                  disabled={!runId || busy.startsWith('scan')}
                  onClick={() => rescan(runId)}
                >
                  {busy.startsWith('scan') ? 'Scanning…' : 'Rescan this run'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="card xl:col-span-2 space-y-2 max-h-[36rem] overflow-y-auto">
          <p className="text-sm text-slate-500">{rows.length} case{rows.length === 1 ? '' : 's'} in this view</p>
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedId(row.id)}
              className={`w-full rounded-2xl border px-3 py-3 text-left transition ${selected?.id === row.id ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200 hover:border-emerald-300'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-emerald-950">{ruleName(row.rule_code)}</p>
                <SeverityBadge value={row.severity} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {row.staff?.display_name || row.staff?.employee_id || 'Unlinked staff'} · {prettyStatus(row.status)} · risk {Number(row.risk_score || 0).toFixed(0)}
              </p>
            </button>
          ))}
          {!rows.length && (
            <div className="py-12 text-center text-slate-400">
              <FiAlertTriangle className="mx-auto mb-2" />
              No cases match these filters.
            </div>
          )}
        </div>

        <div className="card xl:col-span-3 space-y-4">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Selected case</p>
                  <h4 className="mt-1 text-xl font-semibold text-emerald-950">{selected.title}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {selected.staff?.display_name || selected.staff?.employee_id || 'Unlinked staff'}
                    {selected.staff?.department ? ` · ${selected.staff.department}` : ''}
                    {' · '}{selected.payroll_run?.run_name || 'No run'}
                  </p>
                </div>
                <SeverityBadge value={selected.severity} />
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{selected.description}</p>
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-xl bg-stone-50 px-3 py-2">
                  <p className="text-xs text-slate-400">Risk</p>
                  <p className="font-semibold text-emerald-950">{Number(selected.risk_score || 0).toFixed(0)} / 100</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
                    <div className="h-full rounded-full bg-red-600" style={{ width: `${Math.min(100, Number(selected.risk_score || 0))}%` }} />
                  </div>
                </div>
                <div className="rounded-xl bg-stone-50 px-3 py-2">
                  <p className="text-xs text-slate-400">Confidence</p>
                  <p className="font-semibold text-emerald-950">{Number(selected.confidence_score || 0).toFixed(0)}%</p>
                </div>
                <div className="rounded-xl bg-stone-50 px-3 py-2">
                  <p className="text-xs text-slate-400">Status</p>
                  <p className="font-semibold capitalize text-emerald-950">{prettyStatus(selected.status)}</p>
                </div>
              </div>
              {selected.recommended_action && (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">Recommended action</p>
                  <p className="mt-1">{selected.recommended_action}</p>
                </div>
              )}
              <AnomalyFixActions item={selected} onChanged={() => { load(); api.get('/anomalies/summary').then(({ data }) => setSummary(data)) }} />
              {!!evidenceRows(selected.evidence).length && (
                <dl className="grid gap-2 sm:grid-cols-2 text-sm">
                  {evidenceRows(selected.evidence).map((item) => (
                    <div key={item.key} className="flex justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2">
                      <dt className="capitalize text-slate-500">{item.label}</dt>
                      <dd className="font-medium text-emerald-950">{item.display}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => navigate(`/anomalies/${selected.id}`)}>
                  Open full investigation
                </button>
                {canAct && selected.status === 'open' && (
                  <button type="button" className="rounded-lg border border-stone-300 px-4 py-2 text-sm" disabled={busy.startsWith('ack')} onClick={() => acknowledge(selected.id)}>
                    Acknowledge
                  </button>
                )}
                {selected.payroll_run_id && (
                  <Link to={`/payroll/${selected.payroll_run_id}`} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
                    Open salary run
                  </Link>
                )}
              </div>
            </>
          ) : (
            <p className="py-16 text-center text-slate-400">Select a flag to read the evidence and recommended action.</p>
          )}
        </div>
      </div>
    </div>
  )
}
