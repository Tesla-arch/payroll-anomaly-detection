import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiDownload, FiSave } from 'react-icons/fi'
import api from '../api/client'

const components = [
  ['classwork', 'Classwork', 30],
  ['assignment', 'Assignment', 25],
  ['project', 'Project', 25],
  ['homework', 'Homework', 20],
]

function scoreColor(value) {
  if (value == null) return '#cbd5e1'
  if (value >= 80) return '#047857'
  if (value >= 70) return '#0f766e'
  if (value >= 60) return '#ca8a04'
  if (value >= 50) return '#c2410c'
  return '#b91c1c'
}

function NumberField({ disabled, value, onChange }) {
  return (
    <input
      type="number"
      min="0"
      max="100"
      step="1"
      disabled={disabled}
      className="input text-center"
      value={value ?? ''}
      onChange={(event) => {
        const next = event.target.value
        onChange(next === '' ? null : Math.min(100, Math.max(0, Number(next))))
      }}
    />
  )
}

export default function StudentAssessmentPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [year, setYear] = useState('')
  const [term, setTerm] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [comment, setComment] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = (nextYear, nextTerm) => {
    const params = {}
    if (nextYear) params.academic_year = nextYear
    if (nextTerm) params.term = nextTerm
    return api.get(`/students/${id}/assessment`, { params }).then(({ data: payload }) => {
      setData(payload)
      setYear(payload.academic_year)
      setTerm(payload.term)
      setSubjects(payload.subjects)
      setComment(payload.teacher_comment || '')
      setSelectedId((current) => current || payload.subjects[0]?.subject_id)
    })
  }

  useEffect(() => {
    load().catch(() => toast.error('Could not load assessment dashboard'))
  }, [id])

  const selected = subjects.find((item) => item.subject_id === selectedId) || subjects[0]
  const canEdit = Boolean(data?.can_edit)
  const canEditSelected = Boolean(selected?.can_edit)
  const isJhs = data?.student?.level === 'Junior High'
  const overall = data?.summary?.overall
  const ring = useMemo(() => Math.min(100, Number(overall || 0)), [overall])

  const setScore = (subjectId, key, value) => {
    setSubjects((current) => current.map((item) => (
      item.subject_id === subjectId ? { ...item, [key]: value } : item
    )))
  }

  const save = async () => {
    setBusy(true)
    try {
      const { data: payload } = await api.put(`/students/${id}/assessment`, {
        academic_year: year,
        term,
        teacher_comment: comment,
        scores: subjects.map((item) => ({
          subject_id: item.subject_id,
          classwork: item.classwork,
          project: item.project,
          assignment: item.assignment,
          homework: item.homework,
          remark: item.remark,
        })),
      })
      setData(payload)
      setSubjects(payload.subjects)
      setComment(payload.teacher_comment || '')
      toast.success('Term assessment saved')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save scores')
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    try {
      const { data: blob } = await api.get(`/students/${id}/assessment/pdf`, {
        params: { academic_year: year, term },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `report-${data.student.admission_number}-${String(year).replace('/', '-')}-T${term}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download the term report')
    }
  }

  if (!data) return <p className="text-slate-500">Loading assessment dashboard…</p>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/students" className="inline-flex items-center gap-2 text-sm text-emerald-800">
            <FiArrowLeft /> Student register
          </Link>
          <h3 className="mt-2 text-2xl font-semibold text-emerald-950">{data.student.display_name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {data.student.admission_number} · {data.student.class} · {data.student.level}
            {data.student.class_tutor && !isJhs ? ` · Tutor: ${data.student.class_tutor}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-emerald-900 hover:bg-stone-50" onClick={download}>
            <span className="inline-flex items-center gap-2"><FiDownload /> Download PDF report</span>
          </button>
          {canEdit && (
            <button type="button" className="btn-primary inline-flex items-center gap-2" disabled={busy} onClick={save}>
              <FiSave /> {busy ? 'Saving…' : 'Save scores'}
            </button>
          )}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card flex flex-col items-center gap-5 sm:flex-row">
          <svg viewBox="0 0 42 42" className="h-28 w-28 -rotate-90">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle
              cx="21"
              cy="21"
              r="15.9"
              fill="none"
              stroke={scoreColor(overall)}
              strokeWidth="6"
              strokeDasharray={`${ring} ${100 - ring}`}
            />
          </svg>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Term average</p>
            <p className="text-3xl font-semibold text-emerald-950">{overall == null ? '—' : `${overall}%`}</p>
            <p className="text-sm text-slate-500">{data.summary.grade} · {data.summary.remark}</p>
            <p className="mt-1 text-xs text-slate-400">{data.summary.recorded}/{data.summary.offered} subjects recorded</p>
          </div>
        </div>
        <div className="card lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">Academic year</label>
              <select
                className="input mt-1 w-full sm:w-40"
                value={year}
                onChange={(event) => load(event.target.value, term)}
              >
                {(data.years || []).map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => load(year, item)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${term === item ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
                >
                  Term {item}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {(data.term_averages || []).map((item) => (
              <button
                key={item.term}
                type="button"
                onClick={() => load(year, item.term)}
                className={`rounded-xl p-3 text-left ${term === item.term ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-stone-50'}`}
              >
                <p className="text-xs text-slate-400">Term {item.term}</p>
                <p className="mt-1 text-xl font-semibold" style={{ color: scoreColor(item.average) }}>
                  {item.average == null ? '—' : `${item.average}%`}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full" style={{ width: `${item.average || 0}%`, background: scoreColor(item.average) }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <div className="card xl:col-span-2">
          <h4 className="font-semibold text-emerald-950">Subjects offered</h4>
          <p className="mt-1 text-xs text-slate-400">GES {data.student.level} curriculum · click a subject to inspect scores</p>
          <div className="mt-4 space-y-2">
            {subjects.map((item) => (
              <button
                key={item.subject_id}
                type="button"
                onClick={() => setSelectedId(item.subject_id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${selected?.subject_id === item.subject_id ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200 hover:border-emerald-300'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-emerald-950">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {item.code}
                      {item.average == null ? '' : ` · ${item.average}%`}
                      {item.teacher ? ` · ${item.teacher}` : ''}
                      {item.can_edit ? ' · Your subject' : ''}
                    </p>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: scoreColor(item.average) }}>{item.grade}</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {components.map(([key]) => (
                    <div key={key} className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full" style={{ width: `${item[key] || 0}%`, background: scoreColor(item[key]) }} />
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card xl:col-span-3 space-y-5">
          {selected ? (
            <>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Selected subject</p>
                <h4 className="text-xl font-semibold text-emerald-950">{selected.name}</h4>
                <p className="text-sm text-slate-500">{selected.band}{selected.average == null ? '' : ` · ${selected.average}% weighted average`}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {components.map(([key, label, weight]) => (
                  <div key={key} className="rounded-2xl bg-stone-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-emerald-950">{label}</p>
                      <p className="text-xs text-slate-400">{weight}%</p>
                    </div>
                    <p className="mt-2 text-2xl font-semibold" style={{ color: scoreColor(selected[key]) }}>
                      {selected[key] == null ? '—' : selected[key]}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full transition-all" style={{ width: `${selected[key] || 0}%`, background: scoreColor(selected[key]) }} />
                    </div>
                    {canEditSelected && (
                      <div className="mt-3">
                        <NumberField value={selected[key]} onChange={(value) => setScore(selected.subject_id, key, value)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {canEditSelected && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Subject remark</label>
                  <input className="input mt-1" value={selected.remark || ''} onChange={(event) => setScore(selected.subject_id, 'remark', event.target.value)} placeholder="Optional comment for this subject" />
                </div>
              )}
              {canEdit && !canEditSelected && (
                <p className="text-sm text-slate-500">
                  {selected.teacher ? `${selected.teacher} enters scores for this subject.` : 'Another subject teacher enters scores here.'}
                </p>
              )}
            </>
          ) : (
            <p className="text-slate-400">No subjects for this class level.</p>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">
              {isJhs ? 'Teacher’s term comment' : 'Class tutor’s term comment'}
            </label>
            <textarea
              className="input mt-1 min-h-24"
              disabled={!canEdit}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={canEdit ? 'Write a short terminal comment for parents…' : 'No comment yet'}
            />
            {!canEdit && (
              <p className="mt-2 text-xs text-slate-400">
                {isJhs
                  ? 'Scores are view-only except for the JHS subjects assigned to you.'
                  : 'Scores are view-only. Only the class tutor can enter or change continuous assessment.'}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
