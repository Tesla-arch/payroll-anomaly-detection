import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiDownload } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { SeverityBadge } from './Dashboard'
import DataTable from '../components/DataTable'

const steps = [
  { id: 'draft', label: 'Prepared' },
  { id: 'approved', label: 'Headteacher signed' },
  { id: 'paid', label: 'Paid' },
]

function prettyDate(value) {
  return value ? String(value).slice(0, 10) : '—'
}

function ghs(value) {
  return `GHS ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PayrollDetailPage() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const [run, setRun] = useState(null)
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  const [busy, setBusy] = useState('')

  const load = () => api.get(`/payroll-runs/${id}`).then(({ data }) => setRun(data))
  useEffect(() => { load() }, [id])

  const slips = run?.payrolls || []
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return slips
    return slips.filter((row) => {
      const staff = row.staff || {}
      return [staff.employee_id, staff.display_name, staff.department, staff.job_title]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [slips, search])

  const openCritical = (run?.anomalies || []).filter((item) => item.severity === 'critical' && item.status === 'open').length
  const openFlags = (run?.anomalies || []).filter((item) => item.status === 'open').length
  const ssnit = slips.reduce((sum, row) => sum + Number(row.ssnit_contribution || 0), 0)
  const employer = slips.reduce((sum, row) => sum + Number(row.employer_ssnit || 0), 0)
  const loans = slips.reduce((sum, row) => sum + Number(row.loan_deductions || 0), 0)
  const absence = slips.reduce((sum, row) => sum + Number(row.absence_penalties || 0), 0)
  const stepIndex = run?.status === 'paid' ? 2 : run?.status === 'approved' ? 1 : 0

  const downloadPayslip = async (payrollId, employeeId) => {
    const { data } = await api.get(`/payrolls/${payrollId}/payslip`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `payslip-${employeeId || payrollId}.pdf`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const act = async (path, ok) => {
    setBusy(path)
    try {
      await api.post(`/payroll-runs/${id}/${path}`)
      toast.success(ok)
      load()
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.errors?.status?.[0] || 'Action failed')
    } finally {
      setBusy('')
    }
  }

  if (!run) return <p className="text-slate-500">Loading payroll…</p>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/payroll" className="inline-flex items-center gap-2 text-sm text-emerald-800">
            <FiArrowLeft /> Monthly payroll
          </Link>
          <h3 className="mt-2 text-2xl font-semibold text-emerald-950">{run.run_name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {prettyDate(run.pay_period_start)} – {prettyDate(run.pay_period_end)} · pay day {prettyDate(run.payment_date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasRole('hr_officer') && run.status === 'draft' && (
            <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm" disabled={busy} onClick={() => act('cancel', 'Run cancelled')}>
              Cancel draft
            </button>
          )}
          {hasRole('headteacher') && run.status === 'draft' && (
            <button
              className="btn-primary"
              disabled={busy || openCritical > 0}
              onClick={() => act('approve', 'Payroll approved')}
            >
              {openCritical > 0 ? 'Clear critical flags first' : 'Approve for payment'}
            </button>
          )}
          {hasRole('hr_officer') && run.status === 'approved' && (
            <button className="btn-primary" disabled={busy || openCritical > 0} onClick={() => act('paid', 'Marked as paid')}>
              Mark paid
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <div className="flex min-w-max items-center gap-2">
          {steps.map((step, index) => {
            const done = index < stepIndex
            const active = index === stepIndex && run.status !== 'cancelled'
            return (
              <div
                key={step.id}
                className={`flex flex-1 items-center gap-3 rounded-xl px-3 py-3 ${active ? 'bg-emerald-800 text-white' : done ? 'tone-success' : 'text-slate-400'}`}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${active ? 'bg-accent' : done ? 'tone-success-solid' : 'bg-stone-200 text-slate-600'}`}>
                  {index + 1}
                </span>
                <span className="text-sm font-semibold">{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {run.status === 'cancelled' && (
        <div className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-slate-600">This draft was cancelled and cannot be paid.</div>
      )}
      {openCritical > 0 && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100">
          {openCritical} critical flag{openCritical === 1 ? '' : 's'} still open. The Headteacher cannot approve until they are resolved.
        </div>
      )}
      {hasRole('accountant') && !hasRole('hr_officer') && !hasRole('headteacher') && (
        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Accountant view — you can inspect the schedule and download slips. You cannot approve or mark paid.
        </div>
      )}
      {hasRole('auditor') && !hasRole('hr_officer') && !hasRole('headteacher') && (
        <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-slate-700">
          Auditor view — inspect figures and flags. Status changes stay with HR and the Headteacher.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Gross earnings</p>
          <p className="mt-1 text-xl font-semibold text-emerald-950">{ghs(run.total_gross)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">SSNIT employee</p>
          <p className="mt-1 text-xl font-semibold text-emerald-950">{ghs(ssnit)}</p>
          <p className="mt-1 text-xs text-slate-400">Employer 13% {ghs(employer)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Loans + absence</p>
          <p className="mt-1 text-xl font-semibold text-emerald-950">{ghs(loans + absence)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Net payable</p>
          <p className="mt-1 text-xl font-semibold text-emerald-950">{ghs(run.total_net)}</p>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 className="font-semibold text-emerald-950">Salary schedule</h4>
            <p className="text-sm text-slate-500">Click a staff line to see the slip. PAYE is not on this list.</p>
          </div>
          <input className="input w-full max-w-xs" placeholder="Search staff ID, name or department" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-2">
          {visible.map((row) => {
            const open = openId === row.id
            return (
              <div key={row.id} className={`rounded-2xl border ${row.status === 'excluded' ? 'border-stone-200 bg-stone-50 opacity-70' : open ? 'border-emerald-300 bg-emerald-50/40' : 'border-stone-200 bg-white'}`}>
                <button type="button" className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left sm:grid-cols-2 sm:gap-2 lg:grid-cols-6" onClick={() => setOpenId(open ? null : row.id)}>
                  <span>
                    <span className="block font-medium text-emerald-950">{row.staff?.display_name || row.staff?.employee_id}</span>
                    <span className="text-xs text-slate-400">{row.staff?.employee_id} · {row.staff?.department || '—'}{row.status === 'excluded' ? ' · removed' : ''}</span>
                  </span>
                  <span className="text-sm">{ghs(row.gross_salary)}</span>
                  <span className="hidden text-sm sm:block">{ghs(row.ssnit_contribution)}</span>
                  <span className="hidden text-sm sm:block">{ghs(row.loan_deductions)}</span>
                  <span className="text-sm font-medium">{ghs(row.net_salary)}</span>
                  <span className="text-right text-sm text-emerald-800 sm:text-right">{open ? 'Hide' : 'Open slip'}</span>
                </button>
                {open && (
                  <div className="grid gap-3 border-t border-emerald-100 px-4 py-3 sm:grid-cols-2">
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between"><dt className="text-slate-500">Basic</dt><dd>{ghs(row.basic_salary)}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Allowances</dt><dd>{ghs(row.allowances)}</dd></div>
                      <div className="flex justify-between font-medium"><dt>Gross</dt><dd>{ghs(row.gross_salary)}</dd></div>
                    </dl>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between"><dt className="text-slate-500">SSNIT 5.5%</dt><dd>{ghs(row.ssnit_contribution)}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Loan recovery</dt><dd>{ghs(row.loan_deductions)}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Absence</dt><dd>{ghs(row.absence_penalties)}</dd></div>
                      <div className="flex justify-between font-medium"><dt>Net payable</dt><dd>{ghs(row.net_salary)}</dd></div>
                    </dl>
                    <p className="text-xs text-slate-400 sm:col-span-2">
                      Employer SSNIT 13% {ghs(row.employer_ssnit)} · no PAYE on this slip
                    </p>
                    <button type="button" className="inline-flex items-center gap-2 text-sm text-emerald-800" onClick={() => downloadPayslip(row.id, row.staff?.employee_id)}>
                      <FiDownload /> Download payslip PDF
                    </button>
                    {hasRole('hr_officer') && row.staff_id && (
                      <Link to={`/staff/${row.staff_id}/edit`} className="text-sm text-emerald-800">Edit staff file</Link>
                    )}
                    {hasRole('hr_officer') && run.status === 'draft' && row.status !== 'excluded' && (
                      <button
                        type="button"
                        className="text-sm text-emerald-800"
                        disabled={busy === `recalc-${row.id}`}
                        onClick={async () => {
                          setBusy(`recalc-${row.id}`)
                          try {
                            await api.post(`/payrolls/${row.id}/recalculate`)
                            toast.success('Slip recalculated')
                            load()
                          } catch (error) {
                            toast.error(error.response?.data?.errors?.status?.[0] || 'Could not recalculate')
                          } finally {
                            setBusy('')
                          }
                        }}
                      >
                        Recalculate slip
                      </button>
                    )}
                    {hasRole('hr_officer', 'headteacher') && run.status === 'draft' && row.status !== 'excluded' && (
                      <button
                        type="button"
                        className="text-sm text-red-700"
                        disabled={busy === `drop-${row.id}`}
                        onClick={async () => {
                          if (!window.confirm(`Remove ${row.staff?.display_name || row.staff?.employee_id} from this draft? They will not be paid this period.`)) return
                          setBusy(`drop-${row.id}`)
                          try {
                            await api.post(`/payrolls/${row.id}/exclude`)
                            toast.success('Staff removed from this run')
                            load()
                          } catch (error) {
                            toast.error(error.response?.data?.errors?.status?.[0] || 'Could not remove from the run')
                          } finally {
                            setBusy('')
                          }
                        }}
                      >
                        Remove from this run
                      </button>
                    )}
                    {hasRole('hr_officer', 'headteacher') && run.status === 'draft' && row.status === 'excluded' && (
                      <button
                        type="button"
                        className="text-sm text-emerald-800"
                        onClick={async () => {
                          await api.post(`/payrolls/${row.id}/restore`)
                          toast.success('Staff restored on this run')
                          load()
                        }}
                      >
                        Put back on this run
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {!visible.length && <p className="py-8 text-center text-slate-400">No staff lines match this search.</p>}
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="font-semibold text-emerald-950">Anomalies in this run</h4>
          <Link to={`/anomalies?run=${id}&status=open`} className="text-sm text-emerald-800">{openFlags} open</Link>
        </div>
        <DataTable
          rows={run.anomalies || []}
          empty="No flags on this run."
          columns={[
            {
              header: 'Rule',
              primary: true,
              cell: (item) => item.rule_code.replaceAll('_', ' '),
              sub: (item) => item.staff?.employee_id,
            },
            { header: 'Staff', cell: (item) => item.staff?.employee_id },
            { header: 'Severity', cell: (item) => <SeverityBadge value={item.severity} /> },
            { header: 'Status', cell: (item) => <span className="capitalize">{item.status.replaceAll('_', ' ')}</span> },
            {
              header: '',
              actions: true,
              cell: (item) => <Link className="text-emerald-700" to={`/anomalies/${item.id}`}>Review</Link>,
            },
          ]}
        />
      </div>
    </div>
  )
}
