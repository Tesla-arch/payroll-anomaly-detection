import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiBookOpen, FiCheck, FiSearch, FiUser, FiUserMinus, FiUsers, FiX } from 'react-icons/fi'
import api from '../api/client'

const primaryLevels = ['Lower Primary', 'Upper Primary']

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?'
}

function TeacherFace({ teacher, emptyTitle, emptyHint }) {
  if (teacher) {
    return (
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
    )
  }

  return (
    <div className="flex items-center gap-3 text-slate-500">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-stone-200">
        <FiUser />
      </div>
      <div>
        <p className="font-medium text-slate-600">{emptyTitle}</p>
        <p className="text-xs">{emptyHint}</p>
      </div>
    </div>
  )
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [jhs, setJhs] = useState({ classes: [], subjects: [] })
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [classRes, teacherRes, jhsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/classes/teachers'),
        api.get('/classes/jhs-subjects'),
      ])
      setClasses(classRes.data || [])
      setTeachers(teacherRes.data || [])
      setJhs(jhsRes.data || { classes: [], subjects: [] })
    } catch {
      toast.error('Could not load classrooms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const groupedPrimary = useMemo(() => {
    const buckets = {}
    for (const level of primaryLevels) buckets[level] = []
    for (const item of classes) {
      if (!primaryLevels.includes(item.level)) continue
      buckets[item.level].push(item)
    }
    return Object.entries(buckets).filter(([, rows]) => rows.length)
  }, [classes])

  const primaryAssigned = classes.filter((item) => primaryLevels.includes(item.level) && item.teacher_id).length
  const primaryTotal = classes.filter((item) => primaryLevels.includes(item.level)).length
  const jhsAssigned = (jhs.subjects || []).filter((item) => item.teacher_id).length
  const unassignedTeachers = teachers.filter((teacher) => !teacher.classes_count && !teacher.subjects_count)

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
        ...(teacher.subjects || []).map((item) => item.name),
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [teachers, search])

  const refreshTeachers = async () => {
    const teacherRes = await api.get('/classes/teachers')
    setTeachers(teacherRes.data || [])
  }

  const assignClass = async (classId, teacherId) => {
    setBusyId(`class-${classId}`)
    try {
      const { data } = await api.put(`/classes/${classId}/teacher`, { teacher_id: teacherId })
      setClasses((current) => current.map((item) => (item.id === classId ? data : item)))
      await refreshTeachers()
      setAssigning(null)
      setSearch('')
      toast.success(teacherId ? 'Class tutor assigned' : 'Class tutor cleared')
    } catch (error) {
      toast.error(error.response?.data?.errors?.teacher_id?.[0] || error.response?.data?.message || 'Could not update class')
    } finally {
      setBusyId(null)
    }
  }

  const assignSubject = async (subjectId, teacherId) => {
    setBusyId(`subject-${subjectId}`)
    try {
      const { data } = await api.put(`/classes/jhs-subjects/${subjectId}/teacher`, { teacher_id: teacherId })
      setJhs((current) => ({
        ...current,
        subjects: (current.subjects || []).map((item) => (item.id === subjectId ? data : item)),
      }))
      await refreshTeachers()
      setAssigning(null)
      setSearch('')
      toast.success(teacherId ? 'Subject teacher assigned to JHS 1–3' : 'Subject teacher cleared')
    } catch (error) {
      toast.error(error.response?.data?.errors?.teacher_id?.[0] || error.response?.data?.message || 'Could not update subject')
    } finally {
      setBusyId(null)
    }
  }

  const activeClass = assigning?.type === 'class' ? classes.find((item) => item.id === assigning.id) : null
  const activeSubject = assigning?.type === 'subject' ? (jhs.subjects || []).find((item) => item.id === assigning.id) : null
  const pickerTitle = activeClass
    ? `${activeClass.name}`
    : activeSubject
      ? `${activeSubject.name}`
      : ''
  const pickerHint = activeClass
    ? 'This tutor takes this classroom only.'
    : 'This teacher takes this subject in JHS 1, JHS 2 and JHS 3.'

  const toggleAssign = (next) => {
    const same = assigning && assigning.type === next.type && assigning.id === next.id
    setAssigning(same ? null : next)
    setSearch('')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Academics</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Classrooms & tutors</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Lower and Upper Primary keep one class teacher per room. Junior High teachers are assigned by subject and take all three JHS classes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-900">
            {primaryAssigned}/{primaryTotal || 0} primary rooms
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-900">
            {jhsAssigned}/{(jhs.subjects || []).length || 0} JHS subjects
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-slate-600">
            {unassignedTeachers.length} teachers free
          </span>
        </div>
      </div>

      {loading ? (
        <div className="card text-sm text-slate-500">Loading classrooms…</div>
      ) : (
        <div className="space-y-8">
          {groupedPrimary.map(([level, rows]) => (
            <section key={level} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{level}</h4>
                <span className="text-xs text-slate-400">
                  {rows.filter((row) => row.teacher_id).length}/{rows.length} class teachers
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((item) => {
                  const open = assigning?.type === 'class' && assigning.id === item.id
                  return (
                    <article
                      key={item.id}
                      className={`card flex flex-col transition ${open ? 'ring-2 ring-emerald-700' : 'hover:-translate-y-0.5 hover:ring-emerald-300'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-emerald-950">{item.name}</p>
                          <p className="text-xs text-slate-500">One class teacher for this room</p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs text-slate-600">
                          <FiUsers size={12} /> {item.students_count || 0}/{item.capacity || 40}
                        </span>
                      </div>
                      <div className="mt-4 flex-1 rounded-2xl bg-stone-50 p-3">
                        <TeacherFace teacher={item.teacher} emptyTitle="No class teacher" emptyHint="Pick a tutor for this classroom." />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary flex-1"
                          disabled={busyId === `class-${item.id}`}
                          onClick={() => toggleAssign({ type: 'class', id: item.id })}
                        >
                          {open ? 'Close picker' : item.teacher ? 'Change teacher' : 'Assign teacher'}
                        </button>
                        {item.teacher && (
                          <button
                            type="button"
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm text-slate-600 hover:bg-stone-50"
                            disabled={busyId === `class-${item.id}`}
                            onClick={() => assignClass(item.id, null)}
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

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Junior High</h4>
                <p className="mt-1 text-sm text-slate-500">
                  Subject teachers take {(jhs.classes || []).map((item) => item.name).join(', ') || 'JHS 1, 2 and 3'} for the subject they teach.
                </p>
              </div>
              <span className="text-xs text-slate-400">
                {jhsAssigned}/{(jhs.subjects || []).length} subjects staffed
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(jhs.classes || []).map((item) => (
                <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="font-semibold text-emerald-950">{item.name}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                    <FiUsers size={12} /> {item.students_count || 0} pupils · covered by subject teachers
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(jhs.subjects || []).map((item) => {
                const open = assigning?.type === 'subject' && assigning.id === item.id
                return (
                  <article
                    key={item.id}
                    className={`card flex flex-col transition ${open ? 'ring-2 ring-emerald-700' : 'hover:-translate-y-0.5 hover:ring-emerald-300'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-emerald-950">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.code} · JHS 1, 2 and 3</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-900">
                        <FiBookOpen size={12} /> Subject
                      </span>
                    </div>
                    <div className="mt-4 flex-1 rounded-2xl bg-stone-50 p-3">
                      <TeacherFace teacher={item.teacher} emptyTitle="No subject teacher" emptyHint="This person will teach all three JHS classes." />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary flex-1"
                        disabled={busyId === `subject-${item.id}`}
                        onClick={() => toggleAssign({ type: 'subject', id: item.id })}
                      >
                        {open ? 'Close picker' : item.teacher ? 'Change teacher' : 'Assign teacher'}
                      </button>
                      {item.teacher && (
                        <button
                          type="button"
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm text-slate-600 hover:bg-stone-50"
                          disabled={busyId === `subject-${item.id}`}
                          onClick={() => assignSubject(item.id, null)}
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
        </div>
      )}

      {(activeClass || activeSubject) && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-emerald-950/40 p-4 sm:items-center" onClick={() => setAssigning(null)}>
          <div
            className="card max-h-[85dvh] w-full max-w-2xl overflow-hidden !p-0 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  {activeSubject ? 'Assign subject teacher' : 'Assign class teacher'}
                </p>
                <h4 className="mt-1 text-xl font-semibold text-emerald-950">
                  {pickerTitle}
                  {activeClass && <span className="ml-2 text-sm font-normal text-slate-500">{activeClass.level}</span>}
                  {activeSubject && <span className="ml-2 text-sm font-normal text-slate-500">{activeSubject.code}</span>}
                </h4>
                <p className="mt-1 text-sm text-slate-500">{pickerHint}</p>
              </div>
              <button type="button" className="min-h-11 min-w-11 rounded-lg text-slate-500 hover:bg-stone-100" onClick={() => setAssigning(null)} aria-label="Close">
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Search teachers by name, staff ID or subject"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  autoFocus
                />
              </div>

              <div className="max-h-[48dvh] space-y-2 overflow-y-auto pr-1">
                {filteredTeachers.map((teacher) => {
                  const selected = (activeClass && activeClass.teacher_id === teacher.id)
                    || (activeSubject && activeSubject.teacher_id === teacher.id)
                  const extraClasses = (teacher.classes || []).filter((item) => !activeClass || item.id !== activeClass.id)
                  const extraSubjects = (teacher.subjects || []).filter((item) => !activeSubject || item.id !== activeSubject.id)
                  return (
                    <button
                      key={teacher.id}
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => (activeSubject
                        ? assignSubject(activeSubject.id, teacher.id)
                        : assignClass(activeClass.id, teacher.id))}
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
                        {!!extraClasses.length && (
                          <p className="mt-1 text-xs text-amber-700">
                            Class teacher for {extraClasses.map((item) => item.name).join(', ')}
                          </p>
                        )}
                        {!!extraSubjects.length && (
                          <p className="mt-1 text-xs text-amber-700">
                            Already teaching {extraSubjects.map((item) => item.name).join(', ')} in JHS 1–3
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
