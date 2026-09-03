import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiPlus, FiSearch } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/DataTable'

export default function StudentsPage() {
  const { hasRole } = useAuth()
  const canEdit = hasRole('hr_officer', 'teacher')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const classId = params.get('class') || ''
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [classes, setClasses] = useState([])
  const [search, setSearch] = useState(params.get('q') || '')
  const [query, setQuery] = useState(search)

  const setFilter = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => {
      if (value === '' || value == null) next.delete(key)
      else next.set(key, String(value))
    })
    setParams(next, { replace: true })
  }

  useEffect(() => {
    api.get('/classes').then(({ data }) => setClasses(data)).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/students', {
      params: {
        search: search || undefined,
        class_id: classId || undefined,
        per_page: 60,
      },
    }).then(({ data }) => {
      setRows(data.data || data)
      setMeta({ total: data.total ?? (data.data || data).length })
    })
  }, [search, classId])

  useEffect(() => { setQuery(search) }, [search])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== search) setFilter({ q: query })
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

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

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter({ class: '' })}
            className={`rounded-full px-3 py-1.5 text-sm ${!classId ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
          >
            All classes{meta.total && !classId ? ` ${meta.total}` : ''}
          </button>
          {classes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter({ class: String(classId) === String(item.id) ? '' : String(item.id) })}
              className={`rounded-full px-3 py-1.5 text-sm ${String(classId) === String(item.id) ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
            >
              {item.name}
              {item.students_count != null ? (
                <span className={`ml-2 text-xs ${String(classId) === String(item.id) ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {item.students_count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-sm">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search name or admission number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && setFilter({ q: query })}
          />
        </div>
      </div>

      <div className="card">
        <p className="mb-4 text-sm text-slate-500">{meta.total || rows.length} pupil{(meta.total || rows.length) === 1 ? '' : 's'} in this view</p>
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

