import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowRight, FiCopy, FiDownload, FiGlobe, FiRefreshCw, FiSearch, FiShield } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  actionHint,
  actionLabel,
  auditModules,
  dayHeading,
  dayKey,
  initials,
  metadataRows,
  moduleLabel,
  prettyAgo,
  prettyClock,
  prettyWhen,
  toneFor,
} from '../data/auditActions'

const roleDesk = {
  auditor: 'This is the school’s official activity log. Filter by desk, open an event, and follow the record it changed. You cannot alter payroll from here.',
  headteacher: 'See who prepared, approved or paid a salary run, and who changed staff, leave or parent files.',
  super_admin: 'Full assurance desk — every sign-in, payroll decision and flag outcome is listed here.',
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
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

function Badge({ module, sensitive }) {
  const tone = toneFor(module)
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone.bg} ${tone.text}`}>
        {moduleLabel(module)}
      </span>
      {sensitive ? (
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">Sensitive</span>
      ) : null}
    </span>
  )
}

export default function AuditPage() {
  const { role } = useAuth()
  const [params, setParams] = useSearchParams()
  const module = params.get('module') || 'all'
  const action = params.get('action') || ''
  const userId = params.get('user') || ''
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const search = params.get('q') || ''
  const sensitive = params.get('sensitive') === '1'
  const eventId = params.get('event') || ''

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 })
  const [summary, setSummary] = useState(null)
  const [selectedId, setSelectedId] = useState(eventId ? Number(eventId) : null)
  const [query, setQuery] = useState(search)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const listRef = useRef(null)
  const detailRef = useRef(null)

  const queryParams = {
    module: module !== 'all' ? module : undefined,
    action: action || undefined,
    user_id: userId || undefined,
    from: from || undefined,
    to: to || undefined,
    search: search || undefined,
    sensitive: sensitive ? 1 : undefined,
  }

  const setFilter = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => {
      if (value === '' || value == null || value === false) next.delete(key)
      else next.set(key, String(value))
    })
    setParams(next, { replace: true })
    setPage(1)
  }

  const selectEvent = (id) => {
    setSelectedId(id)
    const next = new URLSearchParams(params)
    if (id) next.set('event', String(id))
    else next.delete('event')
    setParams(next, { replace: true })
    if (window.matchMedia('(max-width: 1279px)').matches) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const load = (nextPage = 1, append = false) => {
    setLoading(true)
    api.get('/audit-logs', {
      params: { ...queryParams, page: nextPage, per_page: 40 },
    }).then(({ data }) => {
      const list = data.data || data
      setMeta({
        total: data.total ?? list.length,
        current_page: data.current_page ?? 1,
        last_page: data.last_page ?? 1,
      })
      setRows((current) => {
        const next = append ? [...current, ...list] : list
        const wanted = Number(eventId) || selectedId
        setSelectedId((currentId) => {
          const pick = wanted || currentId
          return next.some((row) => row.id === pick) ? pick : next[0]?.id || null
        })
        return next
      })
    }).catch(() => toast.error('Could not load the audit trail'))
      .finally(() => setLoading(false))
  }

  const loadSummary = () => {
    api.get('/audit-logs/summary', { params: queryParams }).then(({ data }) => setSummary(data)).catch(() => {})
  }

  useEffect(() => {
    load(1, false)
    loadSummary()
  }, [module, action, userId, from, to, search, sensitive])

  useEffect(() => {
    setQuery(search)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== search) setFilter({ q: query })
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const selected = rows.find((row) => row.id === selectedId) || rows[0]
  const grouped = useMemo(() => {
    const groups = []
    rows.forEach((row) => {
      const key = dayKey(row.created_at)
      const last = groups[groups.length - 1]
      if (!last || last.key !== key) groups.push({ key, label: dayHeading(row.created_at), items: [row] })
      else last.items.push(row)
    })
    return groups
  }, [rows])

  const chartDays = useMemo(() => {
    const lookup = Object.fromEntries((summary?.by_day || []).map((row) => [String(row.day).slice(0, 10), Number(row.total || 0)]))
    return Array.from({ length: 14 }, (_, index) => {
      const day = new Date()
      day.setDate(day.getDate() - (13 - index))
      const key = day.toISOString().slice(0, 10)
      return { key, value: lookup[key] || 0 }
    })
  }, [summary])
  const maxDay = Math.max(1, ...chartDays.map((row) => row.value))
  const details = metadataRows(selected?.metadata)
  const today = todayKey()
  const todayActive = from === today && to === today
  const payrollTotal = (summary?.by_module || []).find((row) => row.module === 'payroll')?.total ?? 0

  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-event-id="${selected?.id}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [selected?.id])

  useEffect(() => {
    const onKey = (event) => {
      if (event.target.matches('input, textarea, select, [contenteditable]')) return
      const index = rows.findIndex((row) => row.id === selected?.id)
      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault()
        const next = rows[Math.min(rows.length - 1, index + 1)]
        if (next) selectEvent(next.id)
      }
      if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault()
        const prev = rows[Math.max(0, index - 1)]
        if (prev) selectEvent(prev.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, selected?.id, params])

  const exportView = () => {
    downloadCsv('sms-audit-trail.csv', [
      ['When', 'Actor', 'Role', 'Desk', 'Action', 'Record', 'IP', 'Sensitive'],
      ...rows.map((row) => [
        prettyWhen(row.created_at),
        row.user?.name || 'System',
        row.user?.role || '',
        moduleLabel(row.module),
        actionLabel(row.action),
        row.subject?.label || '',
        row.ip_address || '',
        row.is_sensitive ? 'yes' : '',
      ]),
    ])
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link to this view copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  const filtersOn = module !== 'all' || action || userId || from || to || search || sensitive

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Assurance</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Audit trail</h3>
          <p className="mt-1 text-sm text-slate-500">
            Who changed what, and when — payroll decisions, staff files, leave, flags and sign-ins.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50"
            onClick={() => { setPage(1); load(1, false); loadSummary() }}
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50" onClick={copyLink}>
            <FiCopy /> Copy link
          </button>
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={exportView} disabled={!rows.length}>
            <FiDownload /> Download CSV
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950 ring-1 ring-emerald-100">
        {roleDesk[role] || roleDesk.auditor}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Today', summary?.today ?? '—', 'Events dated today', () => setFilter(todayActive ? { from: '', to: '' } : { from: today, to: today }), todayActive],
          ['In this view', summary?.total ?? meta.total ?? '—', 'Matching the filters below', null, false],
          ['Payroll', payrollTotal, 'Prepare, approve, pay, exclude', () => setFilter({ module: module === 'payroll' ? '' : 'payroll', action: '' }), module === 'payroll'],
          ['Sensitive', summary?.sensitive ?? 0, 'Approvals, pay, deactivations, resolved flags', () => setFilter({ sensitive: sensitive ? '' : '1' }), sensitive, true],
        ].map(([label, value, hint, onClick, active, warn]) => {
          const className = `card text-left transition ${onClick ? 'hover:-translate-y-0.5' : ''} ${active ? 'ring-2 ring-emerald-700' : ''} ${warn && Number(value) > 0 ? 'ring-amber-200' : ''}`
          const body = (
            <>
              <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
              <p className={`mt-1 text-2xl font-semibold ${warn && Number(value) > 0 ? 'text-amber-800' : 'text-emerald-950'}`}>{value}</p>
              <p className="mt-1 text-xs text-slate-400">{hint}</p>
            </>
          )
          return onClick ? (
            <button key={label} type="button" onClick={onClick} className={className}>
              {body}
            </button>
          ) : (
            <div key={label} className={className}>{body}</div>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
      {summary && (
        <div className="card xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h4 className="font-semibold text-emerald-950">Activity · last 14 days</h4>
              <p className="mt-1 text-sm text-slate-500">Click a bar to pin that date. J / K moves the selected event.</p>
            </div>
            {todayActive && (
              <button type="button" className="text-sm text-emerald-800 hover:underline" onClick={() => setFilter({ from: '', to: '' })}>
                Showing today only
              </button>
            )}
          </div>
          <div className="mt-4 flex h-24 items-end gap-1">
            {chartDays.map((point) => {
              const active = from === point.key && to === point.key
              return (
                <button
                  key={point.key}
                  type="button"
                  title={`${point.key}: ${point.value} event${point.value === 1 ? '' : 's'}`}
                  onClick={() => setFilter(active ? { from: '', to: '' } : { from: point.key, to: point.key })}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-1 text-[10px] tabular-nums text-emerald-800 opacity-0 group-hover:opacity-100">
                    {point.value || ''}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition ${active ? 'bg-emerald-800' : point.value ? 'bg-emerald-300 group-hover:bg-emerald-500' : 'bg-stone-200 group-hover:bg-stone-300'}`}
                    style={{ height: `${Math.max(8, (point.value / maxDay) * 100)}%` }}
                  />
                  <span className="mt-1 hidden text-[10px] text-slate-400 sm:block">{Number(point.key.slice(8, 10))}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className={`card space-y-4 ${summary ? 'xl:col-span-3' : 'xl:col-span-5'}`}>
        <div className="flex flex-wrap gap-2">
          {auditModules.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter({ module: item.id === 'all' ? '' : item.id, action: '' })}
              className={`rounded-full px-3 py-1.5 text-sm ${module === item.id ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
            >
              {item.label}
              {item.id === 'all' && summary?.total != null ? (
                <span className={`ml-2 text-xs ${module === item.id ? 'text-emerald-100' : 'text-slate-400'}`}>{summary.total}</span>
              ) : null}
              {item.id !== 'all' && summary?.by_module?.find((row) => row.module === item.id) ? (
                <span className={`ml-2 text-xs ${module === item.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {summary.by_module.find((row) => row.module === item.id).total}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full max-w-sm">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search actor, action or IP"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && setFilter({ q: query })}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">From</label>
            <input type="date" className="input mt-1" value={from} onChange={(event) => setFilter({ from: event.target.value })} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400">To</label>
            <input type="date" className="input mt-1" value={to} onChange={(event) => setFilter({ to: event.target.value })} />
          </div>
          {filtersOn && (
            <button type="button" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" onClick={() => { setQuery(''); setFilter({ module: '', action: '', user: '', from: '', to: '', q: '', sensitive: '', event: '' }) }}>
              Clear filters
            </button>
          )}
        </div>
        {(summary?.by_action || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(summary.by_action || []).slice(0, 8).map((item) => (
              <button
                key={item.action}
                type="button"
                onClick={() => setFilter({ action: action === item.action ? '' : item.action })}
                className={`rounded-full px-3 py-1 text-xs ${action === item.action ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
              >
                {actionLabel(item.action)} · {item.total}
              </button>
            ))}
          </div>
        )}
        {(summary?.actors || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(summary.actors || []).map((actor) => (
              <button
                key={actor.id}
                type="button"
                onClick={() => setFilter({ user: String(userId) === String(actor.id) ? '' : String(actor.id) })}
                className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs ${String(userId) === String(actor.id) ? 'bg-emerald-800 text-white' : 'bg-white ring-1 ring-stone-200 hover:bg-stone-50'}`}
              >
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ${String(userId) === String(actor.id) ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-950 text-amber-300'}`}>
                  {initials(actor.name)}
                </span>
                {actor.name}
                <span className={String(userId) === String(actor.id) ? 'text-emerald-100' : 'text-slate-400'}>{actor.total}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div ref={listRef} className="card xl:col-span-2 max-h-[40rem] space-y-4 overflow-y-auto">
          <p className="sticky top-0 z-[2] bg-white pb-1 text-sm text-slate-500">
            {meta.total} event{meta.total === 1 ? '' : 's'}
            {loading ? ' · loading…' : ''}
          </p>
          {loading && !rows.length && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-2xl bg-stone-100" />
              ))}
            </div>
          )}
          {grouped.map((group) => (
            <section key={group.key}>
              <h4 className="sticky top-6 z-[1] bg-white pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</h4>
              <ol className="space-y-2 border-l border-stone-200 pl-4">
                {group.items.map((row) => {
                  const tone = toneFor(row.module)
                  const active = selected?.id === row.id
                  return (
                    <li key={row.id} className="relative">
                      <span className={`absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full ring-2 ring-white ${tone.dot}`} />
                      <button
                        type="button"
                        data-event-id={row.id}
                        onClick={() => selectEvent(row.id)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-emerald-700 bg-emerald-50' : row.is_sensitive ? 'border-amber-200 hover:border-amber-400' : 'border-stone-200 hover:border-emerald-300'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-emerald-950">{actionLabel(row.action)}</p>
                          <span className="shrink-0 text-xs tabular-nums text-slate-400" title={prettyWhen(row.created_at)}>{prettyClock(row.created_at)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.user?.name || 'System'}
                          {row.user?.role ? ` · ${row.user.role}` : ''}
                          {row.subject?.label ? ` · ${row.subject.label}` : ''}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
          {!rows.length && !loading && (
            <div className="py-12 text-center text-slate-400">
              <FiShield className="mx-auto mb-2" />
              No events match these filters.
            </div>
          )}
          {meta.current_page < meta.last_page && (
            <button
              type="button"
              className="w-full rounded-xl border border-stone-200 py-2 text-sm text-emerald-800 hover:bg-emerald-50"
              onClick={() => {
                const next = page + 1
                setPage(next)
                load(next, true)
              }}
            >
              Load older events
            </button>
          )}
        </div>

        <div ref={detailRef} className="card xl:sticky xl:top-4 xl:col-span-3 xl:self-start space-y-4">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Selected event</p>
                  <h4 className="mt-1 text-xl font-semibold text-emerald-950">{actionLabel(selected.action)}</h4>
                  <p className="mt-1 text-sm text-slate-500" title={prettyWhen(selected.created_at)}>
                    {prettyWhen(selected.created_at)}
                    {prettyAgo(selected.created_at) ? ` · ${prettyAgo(selected.created_at)}` : ''}
                  </p>
                </div>
                <Badge module={selected.module} sensitive={selected.is_sensitive} />
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{actionHint(selected.action)}</p>
              {selected.is_sensitive && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100">
                  Sensitive action — this changed payroll, employment status or a flag outcome.
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-xl bg-stone-50 px-3 py-3">
                  <p className="text-xs text-slate-400">Actor</p>
                  <p className="mt-1 font-semibold text-emerald-950">{selected.user?.name || 'System'}</p>
                  <p className="text-xs text-slate-500">{selected.user?.role || 'Unattended process'}</p>
                </div>
                <div className="rounded-xl bg-stone-50 px-3 py-3">
                  <p className="text-xs text-slate-400">Record</p>
                  <p className="mt-1 font-semibold text-emerald-950">{selected.subject?.label || '—'}</p>
                  <p className="text-xs text-slate-500">{selected.subject?.type || 'No linked record'}</p>
                </div>
                <div className="rounded-xl bg-stone-50 px-3 py-3">
                  <p className="text-xs text-slate-400">Source</p>
                  <p className="mt-1 inline-flex items-center gap-1 font-semibold text-emerald-950">
                    <FiGlobe className="text-slate-400" /> {selected.ip_address || '—'}
                  </p>
                  <p className="text-xs text-slate-500">{selected.action}</p>
                </div>
              </div>
              {!!details.length && (
                <dl className="grid gap-2 sm:grid-cols-2 text-sm">
                  {details.map((item) => (
                    <div key={item.key} className="flex justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2">
                      <dt className="capitalize text-slate-500">{item.label}</dt>
                      <dd className="font-medium text-emerald-950 [overflow-wrap:anywhere]">{item.display}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="flex flex-wrap gap-2">
                {selected.subject?.href && (
                  <Link to={selected.subject.href} className="btn-primary inline-flex items-center gap-2">
                    Open related record <FiArrowRight />
                  </Link>
                )}
                {selected.user?.id && (
                  <button type="button" className="rounded-lg border border-stone-300 px-4 py-2 text-sm" onClick={() => setFilter({ user: String(selected.user.id) })}>
                    Events by this actor
                  </button>
                )}
                <button type="button" className="rounded-lg border border-stone-300 px-4 py-2 text-sm" onClick={() => setFilter({ action: selected.action, module: selected.module })}>
                  Same action only
                </button>
              </div>
            </>
          ) : (
            <p className="py-16 text-center text-slate-400">Select an event to read who did it and which record changed.</p>
          )}
        </div>
      </div>
    </div>
  )
}
