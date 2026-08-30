import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { playbookFor } from '../data/anomalyRules'
import api from '../api/client'

function runOf(item) {
  return item.payroll_run || item.payrollRun || {}
}

export default function AnomalyFixActions({ item, onChanged }) {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const steps = playbookFor(item.rule_code)
  const run = runOf(item)
  const payroll = item.payroll
  const draft = run.status === 'draft'
  const excluded = payroll?.status === 'excluded'
  const staffId = item.staff_id || item.staff?.id
  const payrollId = item.payroll_id || payroll?.id
  const canEditStaff = hasRole('hr_officer')
  const canExclude = hasRole('hr_officer', 'headteacher')
  const canRecalc = hasRole('hr_officer')

  const exclude = async () => {
    if (!payrollId) return toast.error('This flag is not linked to a salary line.')
    if (!window.confirm('Remove this staff from the draft salary run? They will not be paid this period. Open flags on this line will be closed.')) return
    try {
      await api.post(`/payrolls/${payrollId}/exclude`)
      toast.success('Staff removed from this salary run')
      onChanged?.()
    } catch (error) {
      toast.error(error.response?.data?.errors?.status?.[0] || error.response?.data?.message || 'Could not remove from the run')
    }
  }

  const restore = async () => {
    try {
      await api.post(`/payrolls/${payrollId}/restore`)
      toast.success('Staff restored on the draft run')
      onChanged?.()
    } catch (error) {
      toast.error(error.response?.data?.errors?.status?.[0] || error.response?.data?.message || 'Could not restore')
    }
  }

  const recalculate = async () => {
    try {
      await api.post(`/payrolls/${payrollId}/recalculate`)
      toast.success('Slip recalculated and scanned again')
      onChanged?.()
    } catch (error) {
      toast.error(error.response?.data?.errors?.status?.[0] || error.response?.data?.message || 'Could not recalculate')
    }
  }

  const deactivate = async () => {
    if (!staffId) return
    if (!window.confirm('Deactivate this staff file? They will stay off the next payroll prepare. Remove them from this draft separately if they are still on it.')) return
    try {
      await api.post(`/staff/${staffId}/deactivate`)
      toast.success('Staff deactivated')
      onChanged?.()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not deactivate')
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-emerald-950">What to do</h4>
      <p className="text-sm text-slate-500">
        {draft ? 'This run is still a draft, so Payroll can change the salary list.' : 'This run is no longer a draft. Fix the staff file, then hold the next run or cancel and prepare again.'}
      </p>
      <ol className="space-y-3">
        {steps.map((step, index) => {
          const mine = hasRole(...step.roles)
          return (
            <li key={step.id} className={`rounded-xl px-4 py-3 ${mine ? 'bg-emerald-50 ring-1 ring-emerald-100' : 'bg-stone-50'}`}>
              <p className="text-xs uppercase tracking-wide text-slate-400">Step {index + 1} · {step.who}</p>
              <p className="mt-1 text-sm font-medium text-emerald-950">{step.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{step.detail}</p>
              {mine && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {step.id === 'edit' && staffId && (
                    <Link to={`/staff/${staffId}/edit`} className="btn-primary text-sm">Edit staff file</Link>
                  )}
                  {step.id === 'deactivate' && staffId && item.staff?.status !== 'inactive' && (
                    <button type="button" className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-800" onClick={deactivate}>
                      Deactivate staff
                    </button>
                  )}
                  {step.id === 'attendance' && (
                    <Link to="/attendance" className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">Open attendance</Link>
                  )}
                  {step.id === 'recalculate' && canRecalc && draft && payrollId && !excluded && (
                    <button type="button" className="btn-primary text-sm" onClick={recalculate}>Recalculate slip</button>
                  )}
                  {step.id === 'exclude' && canExclude && draft && payrollId && !excluded && (
                    <button type="button" className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-800" onClick={exclude}>
                      Remove from this run
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {excluded && (
        <div className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-slate-600">
          This person is already off the draft.
          {canExclude && payrollId && (
            <button type="button" className="ml-2 text-emerald-800" onClick={restore}>Put them back</button>
          )}
        </div>
      )}
      {canEditStaff && staffId && !steps.some((step) => step.id === 'edit') && (
        <button type="button" className="text-sm text-emerald-800" onClick={() => navigate(`/staff/${staffId}/edit`)}>
          Open staff file
        </button>
      )}
    </div>
  )
}
