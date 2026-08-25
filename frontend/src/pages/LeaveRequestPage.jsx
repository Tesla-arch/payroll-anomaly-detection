import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiCalendar } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

function Field({ label, children, wide, hint }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function parseDate(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function countDays(start, end, mode = 'working') {
  const from = parseDate(start)
  const to = parseDate(end)
  if (!from || !to || to < from) return 0

  if (mode === 'calendar') {
    return Math.round((to - from) / 86400000) + 1
  }

  let days = 0
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    const weekday = cursor.getDay()
    if (weekday !== 0 && weekday !== 6) days += 1
  }
  return days
}

const empty = {
  staff_id: '',
  leave_type: '',
  start_date: '',
  end_date: '',
  reason: '',
  contact_phone: '',
  contact_address: '',
  handover_to: '',
  duties_handed_over: '',
}

export default function LeaveRequestPage() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
  const canApplyForOthers = hasRole('hr_officer')
  const [staffList, setStaffList] = useState([])
  const [applicant, setApplicant] = useState(null)
  const [types, setTypes] = useState([])
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [declared, setDeclared] = useState(false)

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (canApplyForOthers) {
      api.get('/staff', { params: { status: 'active' } }).then(({ data }) => {
        setStaffList(data.data || data)
      }).catch(() => {})
    }
  }, [canApplyForOthers])

  useEffect(() => {
    const controller = new AbortController()
    const params = form.staff_id ? { staff_id: form.staff_id } : {}
    api.get('/leave-types', { params, signal: controller.signal }).then(({ data }) => {
      setApplicant(data.staff || null)
      setTypes(data.types || [])
      if (data.staff && !form.staff_id) {
        setForm((current) => ({ ...current, staff_id: String(data.staff.id) }))
      }
    }).catch((error) => {
      if (error.code !== 'ERR_CANCELED') toast.error('Could not load leave types')
    })
    return () => controller.abort()
  }, [form.staff_id])

  const pickStaff = (id) => {
    set('staff_id', id)
    const member = staffList.find((item) => String(item.id) === String(id))
    if (!member) return
    setApplicant({
      id: member.id,
      employee_id: member.employee_id,
      display_name: member.display_name || `${member.first_name || ''} ${member.last_name || ''}`.trim(),
      department: member.department,
      job_title: member.job_title,
    })
  }

  const selected = types.find((type) => type.code === form.leave_type)
  const days = useMemo(
    () => countDays(form.start_date, form.end_date, selected?.count || 'working'),
    [form.start_date, form.end_date, selected],
  )
  const remaining = selected?.remaining ?? selected?.entitlement ?? 0
  const overMax = selected && days > selected.max_per_request
  const overBalance = selected && days > remaining

  const save = async (event) => {
    event.preventDefault()
    if (!form.leave_type) {
      toast.error('Choose the type of leave')
      return
    }
    if (!form.start_date || !form.end_date) {
      toast.error('Enter the leave start and end dates')
      return
    }
    if (days < 1) {
      toast.error(selected?.count === 'working'
        ? 'Those dates fall on a weekend. Choose working days.'
        : 'The selected dates do not include any leave days.')
      return
    }
    if (overMax) {
      toast.error(`${selected.name} can be requested for at most ${selected.max_per_request} days at a time.`)
      return
    }
    if (overBalance) {
      toast.error(`Only ${remaining} of ${selected.entitlement} ${selected.name.toLowerCase()} days remain this year.`)
      return
    }
    if (selected.requires_note && !form.reason.trim()) {
      toast.error(`State the reason for this ${selected.name.toLowerCase()}.`)
      return
    }
    if (!declared) {
      toast.error('Confirm the declaration before submitting')
      return
    }

    setBusy(true)
    try {
      const payload = {
        ...form,
        staff_id: form.staff_id || undefined,
        reason: form.reason.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_address: form.contact_address.trim() || null,
        handover_to: form.handover_to.trim() || null,
        duties_handed_over: form.duties_handed_over.trim() || null,
      }
      await api.post('/leave-requests', payload)
      toast.success('Leave request submitted to HR')
      navigate('/leave')
    } catch (error) {
      const firstError = error.response?.data?.errors
        ? Object.values(error.response.data.errors)[0]?.[0]
        : null
      toast.error(firstError || error.response?.data?.message || 'Could not submit leave')
    } finally {
      setBusy(false)
    }
  }

  if (!user?.staff_id && !canApplyForOthers) {
    return (
      <div className="card max-w-lg">
        <p className="text-slate-600">Your account is not linked to a staff record, so you cannot request leave.</p>
        <Link to="/leave" className="mt-4 inline-flex items-center gap-2 text-emerald-800">
          <FiArrowLeft /> Back to leave register
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/leave" className="inline-flex items-center gap-2 text-sm text-emerald-800">
            <FiArrowLeft /> Leave register
          </Link>
          <h3 className="mt-2 text-2xl font-semibold text-emerald-950">Leave application</h3>
          <p className="mt-1 text-sm text-slate-500">
            Official staff leave form · days are checked against the yearly entitlement and the maximum for each type.
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
          <p className="text-xs uppercase tracking-wide text-slate-400">Days requested</p>
          <p className="text-2xl font-semibold text-emerald-900">{days || '—'}</p>
        </div>
      </div>

      <form onSubmit={save} className="grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="card space-y-4">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Section A</p>
              <h4 className="mt-1 text-lg font-semibold text-emerald-950">Applicant</h4>
              <p className="text-sm text-slate-500">Staff identity as on the employment file.</p>
            </header>
            {canApplyForOthers && (
              <Field label="Apply for" hint="HR can submit a request on behalf of any active staff member.">
                <select className="input" value={form.staff_id} onChange={(e) => pickStaff(e.target.value)}>
                  <option value="">Select staff</option>
                  {staffList.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.employee_id} — {member.display_name || `${member.first_name || ''} ${member.last_name || ''}`.trim()}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Name</p>
                <p className="mt-1 font-medium text-emerald-950">{applicant?.display_name || '—'}</p>
              </div>
              <div className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Employee ID</p>
                <p className="mt-1 font-medium text-emerald-950">{applicant?.employee_id || '—'}</p>
              </div>
              <div className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Department</p>
                <p className="mt-1 font-medium text-emerald-950">{applicant?.department || '—'}</p>
              </div>
              <div className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Job title</p>
                <p className="mt-1 font-medium text-emerald-950">{applicant?.job_title || '—'}</p>
              </div>
            </div>
          </section>

          <section className="card space-y-4">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Section B</p>
              <h4 className="mt-1 text-lg font-semibold text-emerald-950">Leave particulars</h4>
              <p className="text-sm text-slate-500">Choose one leave type. The day count follows the school ERP policy for that type.</p>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              {types.map((type) => {
                const active = form.leave_type === type.code
                const left = type.remaining ?? type.entitlement
                return (
                  <button
                    key={type.code}
                    type="button"
                    onClick={() => set('leave_type', type.code)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-emerald-700 bg-emerald-50 shadow-sm' : 'border-stone-200 hover:border-emerald-300'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-emerald-950">{type.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${left > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {left} left
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{type.hint}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {type.entitlement} days / year · max {type.max_per_request} per request · {type.count} days
                    </p>
                  </button>
                )
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First day of leave">
                <input type="date" className="input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required />
              </Field>
              <Field label="Last day of leave">
                <input type="date" className="input" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} required />
              </Field>
            </div>
            {selected && (
              <div className={`rounded-xl px-4 py-3 text-sm ${overMax || overBalance ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-900'}`}>
                <p className="inline-flex items-center gap-2 font-medium">
                  <FiCalendar />
                  {days} {selected.count === 'calendar' ? 'calendar' : 'working'} {days === 1 ? 'day' : 'days'} of {selected.name.toLowerCase()}
                </p>
                <p className="mt-1 text-xs opacity-80">
                  Yearly entitlement {selected.entitlement} · remaining {remaining} · maximum in one request {selected.max_per_request}.
                  {overMax && ` This request exceeds the ${selected.max_per_request}-day cap.`}
                  {overBalance && !overMax && ` This request uses more days than remain this year.`}
                </p>
              </div>
            )}
          </section>

          <section className="card space-y-4">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Section C</p>
              <h4 className="mt-1 text-lg font-semibold text-emerald-950">Reason and handover</h4>
              <p className="text-sm text-slate-500">Contact while away and the colleague covering classes or office duties.</p>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reason for leave" wide hint={selected?.requires_note ? 'Required for this leave type.' : 'Optional for annual or paternity leave.'}>
                <textarea
                  className="input min-h-24"
                  value={form.reason}
                  onChange={(e) => set('reason', e.target.value)}
                  placeholder="State why the leave is needed"
                />
              </Field>
              <Field label="Phone while away">
                <input className="input" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} placeholder="024 XXX XXXX" />
              </Field>
              <Field label="Address while away">
                <input className="input" value={form.contact_address} onChange={(e) => set('contact_address', e.target.value)} />
              </Field>
              <Field label="Relieving officer / handover to">
                <input className="input" value={form.handover_to} onChange={(e) => set('handover_to', e.target.value)} placeholder="Name of colleague covering" />
              </Field>
              <Field label="Duties handed over" wide>
                <textarea
                  className="input min-h-20"
                  value={form.duties_handed_over}
                  onChange={(e) => set('duties_handed_over', e.target.value)}
                  placeholder="Classes, registers, keys, or office tasks being covered"
                />
              </Field>
            </div>
          </section>
        </div>

        <aside className="card space-y-4 xl:sticky xl:top-6">
          <h4 className="font-semibold text-emerald-950">Application summary</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Applicant</dt>
              <dd className="text-right font-medium">{applicant?.display_name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Leave type</dt>
              <dd className="text-right font-medium">{selected?.name || 'Not selected'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Period</dt>
              <dd className="text-right font-medium">{form.start_date && form.end_date ? `${form.start_date} – ${form.end_date}` : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Days</dt>
              <dd className="text-right font-medium">{days || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Remaining after</dt>
              <dd className="text-right font-medium">{selected ? Math.max(0, remaining - days) : '—'}</dd>
            </div>
          </dl>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" className="mt-1" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
            I declare that the particulars given are true and that I will resume duty on the next working day after the leave ends.
          </label>
          <button className="btn-primary w-full" disabled={busy || !selected}>
            {busy ? 'Submitting…' : 'Submit leave request'}
          </button>
          <p className="text-xs text-slate-400">
            The request goes to HR first, then to the Headteacher. Approved leave is used on the staff attendance register and payroll scan.
          </p>
        </aside>
      </form>
    </div>
  )
}
