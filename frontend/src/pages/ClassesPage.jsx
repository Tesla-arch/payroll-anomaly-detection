import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiBookOpen, FiCheck, FiSearch, FiUser, FiUserMinus, FiUsers, FiX } from 'react-icons/fi'
import api from '../api/client'

const levelOrder = ['Lower Primary', 'Upper Primary', 'Junior High']

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?'
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [classRes, teacherRes] = await Promise.all([
        api.get('/classes'),
        api.get('/classes/teachers'),
      ])
      setClasses(classRes.data || [])
      setTeachers(teacherRes.data || [])
    } catch {
      toast.error('Could not load classrooms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const grouped = useMemo(() => {
    const buckets = {}
    for (const level of levelOrder) buckets[level] = []
    for (const item of classes) {
      const key = levelOrder.includes(item.level) ? item.level : (item.level || 'Other')
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(item)
    }
    return Object.entries(buckets).filter(([, rows]) => rows.length)
  }, [classes])

  const assignedCount = classes.filter((item) => item.teacher_id).length
  const unassignedTeachers = teachers.filter((teacher) => !teacher.classes_count)

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teachers
    return teachers.filter((teacher) => {
      const haystack = [
        teacher.display_name,
        teacher.employee_id,
        teacher.job_title,
        teacher.department,
        teacher.email,
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [teachers, search])

  const assign = async (classId, teacherId) => {
    setBusyId(classId)
    try {
      const { data } = await api.put(`/classes/${classId}/teacher`, { teacher_id: teacherId })
      setClasses((current) => current.map((item) => (item.id === classId ? data : item)))
      const teacherRes = await api.get('/classes/teachers')
      setTeachers(teacherRes.data || [])
      setAssigningId(null)
      setSearch('')
      toast.success(teacherId ? 'Class tutor assigned' : 'Class tutor cleared')
    } catch (error) {
      toast.error(error.response?.data?.errors?.teacher_id?.[0] || error.response?.data?.message || 'Could not update class')
    } finally {
      setBusyId(null)
    }
  }

  const activeClass = classes.find((item) => item.id === assigningId)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Academics</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Classrooms & tutors</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Headteachers and HR can assign each Grade or JHS class a class teacher. Teachers then see that classroom under My class.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-900">
            {assignedCount}/{classes.length || 0} classes assigned
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-slate-600">
            {unassignedTeachers.length} teachers free
          </span>
        </div>
      </div>

      {loading ? (
        <div className="card text-sm text-slate-500">Loading classrooms…</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([level, rows]) => (
            <section key={level} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{level}</h4>
                <span className="text-xs text-slate-400">
                  {rows.filter((row) => row.teacher_id).length}/{rows.length} tutors set
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((item) => {
                  const teacher = item.teacher
                  const open = assigningId === item.id
                  return (
                    <article
                      key={item.id}
                      className={`card flex flex-col transition ${open ? 'ring-2 ring-emerald-700' : 'hover:-translate-y-0.5 hover:ring-emerald-300'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-emerald-950">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.level}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-slate-600">
                          <FiUsers size={12} /> {item.students_count || 0}/{item.capacity || 40}
                        </span>
                      </div>

                      <div className="mt-4 flex-1 rounded-2xl bg-stone-50 p-3">
                        {teacher ? (
                          <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-800 text-sm font-semibold text-white">
                              {initials(teacher.display_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-emerald-950">{teacher.display_name}</p>
                              <p className="truncate text-xs text-slate-500">
                                {teacher.employee_id}
                                {teacher.job_title ? ` · ${teacher.job_title}` : ''}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-slate-500">
                            <div className="grid h-11 w-11 place-items-center rounded-full bg-stone-200">
                              <FiUser />
                            </div>
                            <div>
                              <p className="font-medium text-slate-600">No class teacher</p>
                              <p className="text-xs">Pick a tutor to open this classroom for My class.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary flex-1"
                          disabled={busyId === item.id}
                          onClick={() => {
                            setAssigningId(open ? null : item.id)
                            setSearch('')
                          }}
                        >
                          {open ? 'Close picker' : teacher ? 'Change teacher' : 'Assign teacher'}
                        </button>
                        {teacher && (
                          <button
                            type="button"
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm text-slate-600 hover:bg-stone-50"
                            disabled={busyId === item.id}
                            onClick={() => assign(item.id, null)}
                          >
                            <FiUserMinus /> Clear
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {activeClass && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-emerald-950/40 p-4 sm:items-center" onClick={() => setAssigningId(null)}>
          <div
            className="card max-h-[85dvh] w-full max-w-2xl overflow-hidden !p-0 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Assign tutor</p>
                <h4 className="mt-1 text-xl font-semibold text-emerald-950">
                  {activeClass.name}
                  <span className="ml-2 text-sm font-normal text-slate-500">{activeClass.level}</span>
                </h4>
                <p className="mt-1 text-sm text-slate-500">Tap a teacher to place them on this classroom. They can hold more than one class if needed.</p>
              </div>
              <button type="button" className="min-h-11 min-w-11 rounded-lg text-slate-500 hover:bg-stone-100" onClick={() => setAssigningId(null)} aria-label="Close">
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Search teachers by name, staff ID or subject desk"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  autoFocus
                />
              </div>

              <div className="max-h-[48dvh] space-y-2 overflow-y-auto pr-1">
                {filteredTeachers.map((teacher) => {
                  const selected = activeClass.teacher_id === teacher.id
                  return (
                    <button
                      key={teacher.id}
                      type="button"
                      disabled={busyId === activeClass.id}
                      onClick={() => assign(activeClass.id, teacher.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                        selected
                          ? 'border-emerald-700 bg-emerald-50'
                          : 'border-stone-200 hover:border-emerald-400 hover:bg-emerald-50/60'
                      }`}
                    >
                      <div className={`grid h-11 w-11 place-items-center rounded-full text-sm font-semibold ${selected ? 'bg-emerald-800 text-white' : 'bg-stone-200 text-emerald-950'}`}>
                        {selected ? <FiCheck /> : initials(teacher.display_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-emerald-950">{teacher.display_name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {teacher.employee_id}
                          {teacher.job_title ? ` · ${teacher.job_title}` : ''}
                          {teacher.department ? ` · ${teacher.department}` : ''}
                        </p>
                        {!!teacher.classes_count && (
                          <p className="mt-1 text-xs text-amber-700">
                            Already tutoring {teacher.classes_count === 1 ? '1 classroom' : `${teacher.classes_count} classrooms`}
                            {teacher.classes?.length ? `: ${teacher.classes.map((item) => item.name).join(', ')}` : ''}
                          </p>
                        )}
                      </div>
                      <FiBookOpen className="shrink-0 text-emerald-700" />
                    </button>
                  )
                })}
                {!filteredTeachers.length && (
                  <p className="rounded-2xl bg-stone-50 px-4 py-8 text-center text-sm text-slate-500">
                    No teaching staff match that search. Register the teacher on the staff desk first.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
