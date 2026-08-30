import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowLeft } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

function monthLabel(value) {
  if (!value) return ''
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}

function lastDay(value) {
  if (!value) return ''
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month, 0).toISOString().slice(0, 10)
}

const empty = {
  run_name: 'August 2026 staff payroll',
  pay_period_start: '2026-08-01',
  pay_period_end: '2026-08-31',
  payment_date: '2026-08-28',
}

export default function PayrollPreparePage() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [staffCount, setStaffCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [closed, setClosed] = useState(false)

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    api.get('/staff', { params: { status: 'active' } }).then(({ data }) => {
      setStaffCount(data.total ?? (data.data || data).length ?? 0)
    }).catch(() => {})
  }, [])

  const setStart = (value) => {
    const end = lastDay(value)
    setForm((current) => ({
      ...current,
      pay_period_start: value,
      pay_period_end: end || current.pay_period_end,
      run_name: `${monthLabel(value)} staff payroll`,
    }))
  }

  const period = useMemo(() => monthLabel(form.pay_period_start), [form.pay_period_start])

  const save = async (event) => {
    event.preventDefault()
    if (!closed) {
      toast.error('Confirm that attendance and leave for this month have been closed')
      return
    }
    setBusy(true)
    try {
      const { data } = await api.post('/payroll-runs', form)
      toast.success('Payroll prepared and scanned for anomalies')
      navigate(`/payroll/${data.id}`)
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.errors?.run_name?.[0] || 'Could not prepare payroll')
    } finally {
      setBusy(false)
    }
  }

  if (!hasRole('hr_officer')) {
    return (
      <div className="card max-w-lg">
        <p className="text-slate-600">Only HR can prepare a monthly salary run.</p>
        <Link to="/payroll" className="mt-4 inline-flex items-center gap-2 text-emerald-800">
          <FiArrowLeft /> Back to payroll
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/payroll" className="inline-flex items-center gap-2 text-sm text-emerald-800">
          <FiArrowLeft /> Monthly payroll
        </Link>
        <h3 className="mt-2 text-2xl font-semibold text-emerald-950">Prepare monthly payroll</h3>
        <p className="mt-1 text-sm text-slate-500">
          Official salary list for active basic-school staff. Deductions are SSNIT 5.5%, loan recovery and unpaid absence.
        </p>
      </div>

      <form onSubmit={save} className="grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="card space-y-4">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Section A</p>
              <h4 className="mt-1 text-lg font-semibold text-emerald-950">Pay period</h4>
              <p className="text-sm text-slate-500">One calendar month, as used on GES / school salary schedules.</p>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">First day of period</label>
                <input type="date" className="input mt-1" value={form.pay_period_start} onChange={(e) => setStart(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Last day of period</label>
                <input type="date" className="input mt-1" value={form.pay_period_end} onChange={(e) => set('pay_period_end', e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Payment date</label>
                <input type="date" className="input mt-1" value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Run name</label>
                <input className="input mt-1" value={form.run_name} onChange={(e) => set('run_name', e.target.value)} required />
              </div>
            </div>
          </section>

          <section className="card space-y-3">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Section B</p>
              <h4 className="mt-1 text-lg font-semibold text-emerald-950">What this run will do</h4>
            </header>
            <ul className="grid gap-3 sm:grid-cols-2 text-sm">
              <li className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="font-medium text-emerald-950">Earnings</p>
                <p className="mt-1 text-slate-600">Basic salary plus posted allowances for every active staff member.</p>
              </li>
              <li className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="font-medium text-emerald-950">SSNIT employee 5.5%</p>
                <p className="mt-1 text-slate-600">First-tier contribution on capped insurable basic. Employer 13% is recorded, not deducted.</p>
              </li>
              <li className="rounded-xl bg-stone-50 px-4 py-3">
                <p className="font-medium text-emerald-950">Loans and absence</p>
                <p className="mt-1 text-slate-600">Active staff-loan recovery and unpaid / absent days after approved leave.</p>
              </li>
              <li className="rounded-xl bg-amber-50 px-4 py-3">
                <p className="font-medium text-amber-950">No PAYE</p>
                <p className="mt-1 text-slate-600">Income tax is not taken on this school payroll. Net pay is gross minus SSNIT, loans and absence.</p>
              </li>
            </ul>
          </section>
        </div>

        <aside className="card space-y-4 xl:sticky xl:top-6">
          <h4 className="font-semibold text-emerald-950">Run summary</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Month</dt>
              <dd className="font-medium">{period || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Active staff</dt>
              <dd className="font-medium">{staffCount || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">After generate</dt>
              <dd className="text-right font-medium">Draft → Headteacher</dd>
            </div>
          </dl>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" className="mt-1" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
            Attendance and approved leave for this period have been closed. The anomaly scan will run automatically.
          </label>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Preparing…' : 'Generate salary run'}
          </button>
          <p className="text-xs text-slate-400">
            The Headteacher must approve before you can mark the run paid. Critical flags block approval.
          </p>
        </aside>
      </form>
    </div>
  )
}
