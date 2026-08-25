import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiPlus, FiSearch } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/DataTable'

export default function StudentsPage() {
  const { hasRole } = useAuth()
  const canEdit = hasRole('hr_officer', 'teacher')
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/students', { params: { search } }).then(({ data }) => setRows(data.data || data))
  }, [search])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Academics</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Student register</h3>
          <p className="mt-1 text-sm text-slate-500">Open a pupil to view term assessments, or download the terminal report.</p>
        </div>
        {canEdit && (
          <Link to="/students/register" className="btn-primary inline-flex items-center gap-2">
            <FiPlus /> Register student
          </Link>
        )}
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative w-full max-w-sm">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search name or admission number" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <DataTable
          rows={rows}
          empty="No student records found."
          onRowClick={(row) => navigate(`/students/${row.id}/assessment`)}
          columns={[
            {
              header: 'Admission',
              primary: true,
              cell: (row) => row.admission_number,
              sub: (row) => row.display_name || `${row.first_name} ${row.last_name}`,
            },
            { header: 'Name', hideOnMobile: true, cell: (row) => row.display_name || `${row.first_name} ${row.last_name}` },
            {
              header: 'Class',
              cell: (row) => row.school_class ? (
                <span>
                  {row.school_class.name}
                  {row.school_class.level && (
                    <span className="block text-xs text-slate-400">{row.school_class.level}</span>
                  )}
                </span>
              ) : '—',
            },
            { header: 'Gender', cell: (row) => <span className="capitalize">{row.gender || '—'}</span> },
            { header: 'Status', cell: (row) => <span className="capitalize">{row.status || 'active'}</span> },
            {
              header: '',
              actions: true,
              cell: (row) => (
                <>
                  <button className="text-emerald-700" onClick={() => navigate(`/students/${row.id}/assessment`)}>Assessment</button>
                  {canEdit && (
                    <button className="text-emerald-700" onClick={() => navigate(`/students/${row.id}/edit`)}>Edit</button>
                  )}
                </>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
