import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiBookOpen, FiCheck, FiSave, FiUsers } from 'react-icons/fi'
import api from '../api/client'
import DataTable from '../components/DataTable'

const statuses = [
  { id: 'present', label: 'Present' },
  { id: 'late', label: 'Late' },
  { id: 'absent', label: 'Absent' },
  { id: 'excused', label: 'Excused' },
]

const tabs = [
  { id: 'register', label: 'Class register' },
  { id: 'attendance', label: 'Daily attendance' },
  { id: 'assessments', label: 'Assessments' },
]

function statusClass(status, active) {
  if (!active) return 'bg-stone-100 text-slate-600 hover:bg-stone-200'
  if (status === 'present') return 'bg-emerald-800 text-white'
  if (status === 'late') return 'bg-amber-500 text-white'
  if (status === 'absent') return 'bg-red-700 text-white'
  return 'bg-sky-700 text-white'
}

export default function MyClassPage() {
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState(null)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState('register')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState(null)
  const [marks, setMarks] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/my-class').then(({ data: payload }) => {
      const list = payload.classes || []
      setClasses(list)
      setClassId((current) => current || list[0]?.id || null)
    }).catch(() => toast.error('Could not load your class assignment'))
      .finally(() => setReady(true))
  }, [])

  const loadClass = (id, nextDate = date) => {
    if (!id) return
    api.get(`/my-class/${id}`, { params: { date: nextDate } }).then(({ data: payload }) => {
      setData(payload)
      const next = {}
      payload.pupils.forEach((pupil) => {
        next[pupil.id] = pupil.attendance || ''
      })
      setMarks(next)
    }).catch((error) => {
      toast.error(error.response?.data?.message || 'Could not open this class')
    })
  }

  useEffect(() => {
    if (classId) loadClass(classId, date)
  }, [classId, date])

  const selected = classes.find((item) => item.id === classId)
  const pupils = data?.pupils || []
  const summary = data?.summary || {}
  const markedCount = useMemo(() => Object.values(marks).filter(Boolean).length, [marks])

  const setAll = (status) => {
    const next = {}
    pupils.forEach((pupil) => { next[pupil.id] = status })
    setMarks(next)
  }

  const save = async () => {
    const records = pupils
      .filter((pupil) => marks[pupil.id])
      .map((pupil) => ({ student_id: pupil.id, status: marks[pupil.id] }))
    if (!records.length) {
      toast.error('Mark at least one pupil before saving')
      return
    }
    setBusy(true)
    try {
      const { data: payload } = await api.put(`/my-class/${classId}/attendance`, { date, records })
      setData(payload)
      toast.success('Class attendance saved')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save attendance')
    } finally {
      setBusy(false)
    }
  }

  if (!ready) {
    return <p className="text-slate-500">Loading your class…</p>
  }

  if (!classes.length) {
    return (
      <div className="card max-w-xl">
        <h3 className="text-xl font-semibold text-emerald-950">No class assigned</h3>
        <p className="mt-2 text-sm text-slate-600">
          You are not listed as class tutor on any class. Ask HR or the headteacher to assign you a class.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Class teacher</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">My class</h3>
          <p className="mt-1 text-sm text-slate-500">Manage your pupils, take today’s attendance and record term assessments.</p>
        </div>
        {classes.length > 1 && (
          <select className="input w-56" value={classId || ''} onChange={(event) => setClassId(Number(event.target.value))}>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.level} ({item.students_count})</option>
            ))}
          </select>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">Assigned class</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-950">{selected?.name || '—'}</p>
          <p className="text-xs text-slate-400">{selected?.level}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">On roll</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-950">{summary.roll ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Present / late today</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-800">{(summary.present || 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Absent</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">{summary.absent ?? 0}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${tab === item.id ? 'bg-emerald-800 text-white' : 'bg-white text-slate-600 ring-1 ring-stone-200 hover:bg-stone-50'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'register' && (
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <FiUsers className="text-emerald-700" />
            <h4 className="font-semibold text-emerald-950">Pupils in {selected?.name}</h4>
          </div>
          <DataTable
            rows={pupils}
            empty="No pupils in this class yet."
            columns={[
              {
                header: 'Admission',
                primary: true,
                cell: (pupil) => pupil.admission_number,
                sub: (pupil) => pupil.display_name,
              },
              { header: 'Name', hideOnMobile: true, cell: (pupil) => pupil.display_name },
              { header: 'Gender', cell: (pupil) => <span className="capitalize">{pupil.gender || '—'}</span> },
              {
                header: 'Guardian',
                cell: (pupil) => (
                  <>
                    {pupil.guardian_name || '—'}
                    {pupil.guardian_phone && <span className="block text-xs text-slate-400">{pupil.guardian_phone}</span>}
                  </>
                ),
              },
              { header: 'Today', cell: (pupil) => <span className="capitalize">{pupil.attendance || 'Unmarked'}</span> },
              {
                header: '',
                actions: true,
                cell: (pupil) => <Link className="text-emerald-700" to={`/students/${pupil.id}/assessment`}>Assessments</Link>,
              },
            ]}
          />
        </div>
      )}

      {tab === 'attendance' && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h4 className="font-semibold text-emerald-950">Daily attendance</h4>
              <p className="text-sm text-slate-500">{markedCount} of {pupils.length} marked for {date}</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Date</label>
                <input type="date" className="input mt-1" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <button type="button" className="rounded-lg bg-stone-100 px-3 py-2 text-sm" onClick={() => setAll('present')}>Mark all present</button>
              <button type="button" className="btn-primary inline-flex items-center gap-2" disabled={busy} onClick={save}>
                <FiSave /> {busy ? 'Saving…' : 'Save register'}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {pupils.map((pupil) => (
              <div key={pupil.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-3">
                <div>
                  <p className="font-medium text-emerald-950">{pupil.display_name}</p>
                  <p className="text-xs text-slate-400">{pupil.admission_number}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => setMarks((current) => ({ ...current, [pupil.id]: status.id }))}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(status.id, marks[pupil.id] === status.id)}`}
                    >
                      {marks[pupil.id] === status.id && <FiCheck className="mr-1 inline" />}
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!pupils.length && <p className="py-6 text-center text-sm text-slate-400">No pupils to mark.</p>}
          </div>
        </div>
      )}

      {tab === 'assessments' && (
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <FiBookOpen className="text-emerald-700" />
            <div>
              <h4 className="font-semibold text-emerald-950">Term assessments</h4>
              <p className="text-sm text-slate-500">
                {data?.academic_year} · Term {data?.term} · classwork, assignments, projects and homework
              </p>
            </div>
          </div>
          <DataTable
            rows={pupils}
            empty="No pupils in this class yet."
            columns={[
              {
                header: 'Pupil',
                primary: true,
                cell: (pupil) => pupil.display_name,
                sub: (pupil) => pupil.admission_number,
              },
              { header: 'Admission', hideOnMobile: true, cell: (pupil) => pupil.admission_number },
              { header: 'Term average', cell: (pupil) => (pupil.term_average == null ? 'Not recorded' : `${pupil.term_average}%`) },
              {
                header: '',
                actions: true,
                cell: (pupil) => <Link className="btn-primary inline-flex text-xs" to={`/students/${pupil.id}/assessment`}>Record scores</Link>,
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}
