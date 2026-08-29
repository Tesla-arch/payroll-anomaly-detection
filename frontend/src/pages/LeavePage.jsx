import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiPlus } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/DataTable'

const statusFilters = [
  { id: 'all', label: 'All' },
  { id: 'pending_hr', label: 'Awaiting HR' },
  { id: 'pending_headteacher', label: 'Awaiting Headteacher' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

const statusTone = {
  pending_hr: 'bg-amber-50 text-amber-800',
  pending_headteacher: 'bg-sky-50 text-sky-800',
  approved: 'tone-success',
  rejected: 'bg-rose-50 text-rose-800',
}

const statusLabel = {
  pending_hr: 'Awaiting HR',
  pending_headteacher: 'Awaiting Headteacher',
  approved: 'Approved',
  rejected: 'Rejected',
}

function prettyStatus(status) {
  return statusLabel[status] || (status || '').replaceAll('_', ' ')
}

function prettyType(type) {
  return (type || '').replaceAll('_', ' ')
}

function prettyDate(value) {
  return value ? String(value).slice(0, 10) : '—'
}

export default function LeavePage() {
  const { user, hasRole } = useAuth()
  const canRequest = Boolean(user?.staff_id) || hasRole('hr_officer')
  const [rows, setRows] = useState([])
  const [types, setTypes] = useState([])
  const [filter, setFilter] = useState('all')

  const load = () => {
    const params = filter === 'all' ? {} : { status: filter }
    api.get('/leave-requests', { params }).then(({ data }) => setRows(data.data || data))
  }

  useEffect(() => {
    load()
  }, [filter])

  useEffect(() => {
    api.get('/leave-types').then(({ data }) => setTypes(data.types || [])).catch(() => {})
  }, [])

  const act = async (id, path, decision) => {
    try {
      await api.post(`/leave-requests/${id}/${path}`, { decision })
      toast.success(decision === 'forward' ? 'Forwarded to the Headteacher' : decision === 'approve' ? 'Leave approved' : 'Leave rejected')
      load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed')
    }
  }

  const counts = useMemo(() => ({
    pending: rows.filter((row) => row.status === 'pending_hr' || row.status === 'pending_headteacher').length,
    approved: rows.filter((row) => row.status === 'approved').length,
  }), [rows])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Human resources</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Leave register</h3>
          <p className="mt-1 text-sm text-slate-500">
            Staff apply on the leave form. HR reviews first, then the Headteacher approves.
          </p>
        </div>
        {canRequest && (
          <Link to="/leave/request" className="btn-primary inline-flex items-center gap-2">
            <FiPlus /> Request leave
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">In this list</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{rows.length}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Awaiting action</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{counts.pending}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Approved</p>
          <p className="text-success mt-1 text-2xl font-semibold">{counts.approved}</p>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap gap-2">
          {statusFilters.map((item) => (
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
        <DataTable
          rows={rows}
          empty="No leave requests in this view."
          columns={[
            {
              header: 'Staff',
              primary: true,
              cell: (row) => row.staff?.display_name || row.staff?.employee_id,
              sub: (row) => `${row.staff?.employee_id || ''} · ${row.staff?.department || '—'}`,
            },
            { header: 'Leave type', cell: (row) => <span className="capitalize">{prettyType(row.leave_type)}</span> },
            { header: 'Period', cell: (row) => `${prettyDate(row.start_date)} – ${prettyDate(row.end_date)}` },
            { header: 'Days', cell: (row) => row.days_requested },
            {
              header: 'Status',
              cell: (row) => (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone[row.status] || 'bg-stone-100'}`}>
                  {prettyStatus(row.status)}
                </span>
              ),
            },
            {
              header: '',
              actions: true,
              cell: (row) => (
                <>
                  {hasRole('hr_officer') && row.status === 'pending_hr' && (
                    <>
                      <button className="text-emerald-700" onClick={() => act(row.id, 'review', 'forward')}>Forward</button>
                      <button className="text-red-600" onClick={() => act(row.id, 'review', 'reject')}>Reject</button>
                    </>
                  )}
                  {hasRole('headteacher') && row.status === 'pending_headteacher' && (
                    <>
                      <button className="text-emerald-700" onClick={() => act(row.id, 'approve', 'approve')}>Approve</button>
                      <button className="text-red-600" onClick={() => act(row.id, 'approve', 'reject')}>Reject</button>
                    </>
                  )}
                </>
              ),
            },
          ]}
        />
      </div>

      {!!types.length && (
        <div className="card">
          <h4 className="font-semibold text-emerald-950">Leave entitlements this year</h4>
          <p className="mt-1 text-sm text-slate-500">
            Days a staff member can apply for, and how many remain on this account.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="table min-w-[32rem]">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Yearly days</th>
                  <th>Max per request</th>
                  <th>Used</th>
                  <th>Remaining</th>
                  <th>Counted as</th>
                </tr>
              </thead>
              <tbody>
                {types.map((type) => (
                  <tr key={type.code}>
                    <td>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-xs text-slate-400">{type.hint}</p>
                    </td>
                    <td>{type.entitlement}</td>
                    <td>{type.max_per_request}</td>
                    <td>{type.used ?? '—'}</td>
                    <td className="font-medium text-emerald-900">{type.remaining ?? type.entitlement}</td>
                    <td className="capitalize">{type.count} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
