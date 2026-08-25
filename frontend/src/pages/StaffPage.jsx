import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiPlus, FiSearch } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/DataTable'

export default function StaffPage() {
  const { hasRole } = useAuth()
  const canEdit = hasRole('hr_officer')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState(params.get('q') || '')

  const load = () => {
    api.get('/staff', { params: { search } }).then(({ data }) => setRows(data.data || data))
  }

  useEffect(() => {
    load()
  }, [search])

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this staff file? They will not be picked up on the next payroll prepare. Remove them from any open draft run separately.')) return
    await api.post(`/staff/${id}/deactivate`)
    toast.success('Staff deactivated')
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Human resources</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Staff register</h3>
          <p className="mt-1 text-sm text-slate-500">All employees currently linked to payroll, attendance and leave.</p>
        </div>
        {canEdit && (
          <Link to="/staff/register" className="btn-primary inline-flex items-center gap-2">
            <FiPlus /> Register staff
          </Link>
        )}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative w-full max-w-sm flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search name, employee ID or department" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <DataTable
          rows={rows}
          empty="No staff records found."
          columns={[
            {
              header: 'Employee ID',
              primary: true,
              cell: (row) => row.employee_id,
              sub: (row) => row.display_name || (row.user ? `${row.user.first_name} ${row.user.last_name}` : '—'),
            },
            { header: 'Name', hideOnMobile: true, cell: (row) => row.display_name || (row.user ? `${row.user.first_name} ${row.user.last_name}` : '—') },
            { header: 'Dept', cell: (row) => row.department || '—' },
            { header: 'Rank / title', cell: (row) => row.rank || row.job_title || '—' },
            { header: 'Salary', cell: (row) => `GHS ${Number(row.salary).toLocaleString()}` },
            { header: 'Status', cell: (row) => <span className="capitalize">{row.status}</span> },
            ...(canEdit ? [{
              header: '',
              actions: true,
              cell: (row) => (
                <>
                  <button className="text-emerald-700" onClick={() => navigate(`/staff/${row.id}/edit`)}>Edit</button>
                  {row.status === 'active' && (
                    <button className="text-red-600" onClick={() => deactivate(row.id)}>Deactivate</button>
                  )}
                </>
              ),
            }] : []),
          ]}
        />
      </div>
    </div>
  )
}
