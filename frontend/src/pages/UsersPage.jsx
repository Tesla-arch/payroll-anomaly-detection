import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiPlus, FiSearch, FiUsers } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/DataTable'
import { initials, portalRoles, roleHint } from '../data/portalRoles'

function StatusBadge({ status }) {
  const on = status === 'active'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${on ? 'tone-success' : 'bg-stone-100 text-slate-600'}`}>
      {on ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function UsersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const role = params.get('role') || 'all'
  const status = params.get('status') || 'all'
  const search = params.get('q') || ''

  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [query, setQuery] = useState(search)
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState('')

  const setFilter = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => {
      if (value === '' || value == null || value === 'all') next.delete(key)
      else next.set(key, String(value))
    })
    setParams(next, { replace: true })
  }

  const load = () => {
    api.get('/users', {
      params: {
        role: role !== 'all' ? role : undefined,
        status: status !== 'all' ? status : undefined,
        search: search || undefined,
        per_page: 60,
      },
    }).then(({ data }) => {
      const list = data.data || data
      setRows(list)
      setSelectedId((current) => (list.some((row) => row.id === current) ? current : list[0]?.id || null))
    }).catch(() => toast.error('Could not load portal users'))
  }

  useEffect(() => { load() }, [role, status, search])
  useEffect(() => {
    api.get('/users/summary', { params: { search: search || undefined } })
      .then(({ data }) => setSummary(data))
      .catch(() => {})
  }, [search])
  useEffect(() => { setQuery(search) }, [search])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== search) setFilter({ q: query })
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const selected = rows.find((row) => row.id === selectedId) || rows[0]
  const filtersOn = role !== 'all' || status !== 'all' || search

  const setStatus = async (row, next) => {
    if (row.id === user?.id && next === 'inactive') {
      toast.error('You cannot deactivate your own account')
      return
    }
    setBusy(`${row.id}-${next}`)
    try {
      await api.put(`/users/${row.id}`, { status: next })
      toast.success(next === 'active' ? 'Account reactivated' : 'Account deactivated')
      load()
      api.get('/users/summary', { params: { search: search || undefined } }).then(({ data }) => setSummary(data))
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.errors?.status?.[0] || 'Could not update the account')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Accounts</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Portal users</h3>
          <p className="mt-1 text-sm text-slate-500">
            Who can sign in — Headteacher, HR, payroll, teachers, auditor and parents.
          </p>
        </div>
        <Link to="/users/create" className="btn-primary inline-flex shrink-0 items-center gap-2">
          <FiPlus /> Create user
        </Link>
      </div>

      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950 ring-1 ring-emerald-100">
        Create an account, pick a desk, then share the email and password. Deactivating someone blocks sign-in without deleting the audit trail.
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['All accounts', summary?.total ?? '—', () => setFilter({ status: 'all' }), status === 'all'],
          ['Active', summary?.active ?? '—', () => setFilter({ status: status === 'active' ? 'all' : 'active' }), status === 'active'],
          ['Inactive', summary?.inactive ?? 0, () => setFilter({ status: status === 'inactive' ? 'all' : 'inactive' }), status === 'inactive'],
        ].map(([label, value, onClick, active]) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={`card text-left transition hover:-translate-y-0.5 ${active ? 'ring-2 ring-emerald-700' : ''}`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-950">{value}</p>
          </button>
        ))}
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter({ role: 'all' })}
            className={`rounded-full px-3 py-1.5 text-sm ${role === 'all' ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
          >
            All desks{summary?.total != null ? ` ${summary.total}` : ''}
          </button>
          {portalRoles.map((item) => {
            const count = summary?.by_role?.find((row) => row.slug === item.slug)?.total
            return (
              <button
                key={item.slug}
                type="button"
                title={item.hint}
                onClick={() => setFilter({ role: role === item.slug ? 'all' : item.slug })}
                className={`rounded-full px-3 py-1.5 text-sm ${role === item.slug ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
              >
                {item.label}
                {count ? <span className={`ml-2 text-xs ${role === item.slug ? 'text-emerald-100' : 'text-slate-400'}`}>{count}</span> : null}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search name, email or phone"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && setFilter({ q: query })}
            />
          </div>
          {filtersOn && (
            <button type="button" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" onClick={() => { setQuery(''); setFilter({ role: 'all', status: 'all', q: '' }) }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="card min-w-0 xl:col-span-3">
          <p className="mb-4 text-sm text-slate-500">
            {rows.length} account{rows.length === 1 ? '' : 's'} in this view
          </p>
          <DataTable
            rows={rows}
            empty="No accounts match these filters."
            onRowClick={(row) => setSelectedId(row.id)}
            columns={[
              {
                header: 'Name',
                primary: true,
                cell: (row) => (
                  <span className="inline-flex items-center gap-2">
                    <span className="bg-brand text-accent grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold">
                      {initials(row.name)}
                    </span>
                    {row.name}
                  </span>
                ),
                sub: (row) => row.email,
              },
              { header: 'Email', hideOnMobile: true, cell: (row) => <span className="break-all">{row.email}</span> },
              { header: 'Desk', cell: (row) => row.role?.name || '—' },
              { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
              {
                header: '',
                actions: true,
                cell: (row) => (
                  <button type="button" className="text-emerald-700" onClick={() => navigate(`/users/${row.id}/edit`)}>
                    Edit
                  </button>
                ),
              },
            ]}
          />
        </div>

        <div className="card xl:sticky xl:top-4 xl:col-span-2 xl:self-start space-y-4">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="bg-brand text-accent grid h-12 w-12 place-items-center rounded-full text-sm font-semibold">
                    {initials(selected.name)}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Selected account</p>
                    <h4 className="mt-1 text-xl font-semibold text-emerald-950">{selected.name}</h4>
                    <p className="text-sm text-slate-500">{selected.email}</p>
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{roleHint(selected.role?.slug)}</p>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-xl bg-stone-50 px-3 py-3">
                  <p className="text-xs text-slate-400">Desk</p>
                  <p className="mt-1 font-semibold text-emerald-950">{selected.role?.name || '—'}</p>
                </div>
                <div className="rounded-xl bg-stone-50 px-3 py-3">
                  <p className="text-xs text-slate-400">Phone</p>
                  <p className="mt-1 font-semibold text-emerald-950">{selected.phone || '—'}</p>
                </div>
              </div>
              {selected.staff && (
                <div className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
                  Linked staff file {selected.staff.employee_id || selected.staff.display_name}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Link to={`/users/${selected.id}/edit`} className="btn-primary">
                  Edit account
                </Link>
                {selected.status === 'active' ? (
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-50"
                    disabled={busy.startsWith(String(selected.id)) || selected.id === user?.id}
                    onClick={() => setStatus(selected, 'inactive')}
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
                    disabled={busy.startsWith(String(selected.id))}
                    onClick={() => setStatus(selected, 'active')}
                  >
                    Reactivate
                  </button>
                )}
                {selected.staff?.id && (
                  <Link to={`/staff/${selected.staff.id}/edit`} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
                    Open staff file
                  </Link>
                )}
                <Link to={`/audit?user=${selected.id}`} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
                  Audit events
                </Link>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <FiUsers className="mx-auto mb-2" />
              Select an account, or create a user.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
