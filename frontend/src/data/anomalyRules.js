export const ruleCatalogue = {
  Ghost_No_User_Account: {
    name: 'Ghost — no user account',
    hint: 'Payee has no linked login. Hold the salary until HR links a user.',
  },
  Ghost_Inactive_Staff: {
    name: 'Ghost — inactive staff',
    hint: 'An inactive employee is still on this run.',
  },
  Payment_Without_Attendance: {
    name: 'Paid without attendance',
    hint: 'No present/late mark and no approved leave in the period.',
  },
  Duplicate_Period_Payment: {
    name: 'Duplicate payment',
    hint: 'More than one salary line for the same staff in this period.',
  },
  Unusually_High_Salary: {
    name: 'Unusually high salary',
    hint: 'Gross pay is above 1.5× the grade or basic.',
  },
  Ssnit_Mismatch: {
    name: 'SSNIT mismatch',
    hint: 'Employee 5.5% does not match capped basic.',
  },
  Bank_Details_Missing: {
    name: 'Bank details missing',
    hint: 'Cannot pay until bank name and account are on file.',
  },
  Loan_Over_Deduction: {
    name: 'Loan over-deduction',
    hint: 'Recovery is higher than the outstanding loan balance.',
  },
  Unauthorized_Allowance: {
    name: 'Unauthorized allowance',
    hint: 'Allowance is not authorized or exceeds the grade cap.',
  },
}

export const defaultPlaybook = [
  { id: 'edit', who: 'HR', roles: ['hr_officer'], title: 'Correct the staff file', detail: 'Update salary, bank, status or the linked user, then recalculate the slip.' },
  { id: 'recalculate', who: 'HR', roles: ['hr_officer'], title: 'Recalculate this slip', detail: 'Rebuild the line from the current staff record and scan again.' },
  { id: 'exclude', who: 'HR', roles: ['hr_officer', 'headteacher'], title: 'Remove from this draft', detail: 'Drop the person from this month if they should not be paid.' },
]

export const rulePlaybook = {
  Ghost_No_User_Account: [
    { id: 'edit', who: 'HR', roles: ['hr_officer'], title: 'Link a user account', detail: 'Open the staff file and attach a login. Ghosts cannot be paid until this is done.' },
    { id: 'recalculate', who: 'HR', roles: ['hr_officer'], title: 'Recalculate and rescan', detail: 'After the user is linked, rebuild this slip so the critical flag can clear.' },
    { id: 'exclude', who: 'HR', roles: ['hr_officer', 'headteacher'], title: 'Remove from this draft', detail: 'If they should not be on this month’s list, drop the salary line.' },
  ],
  Ghost_Inactive_Staff: [
    { id: 'edit', who: 'HR', roles: ['hr_officer'], title: 'Confirm employment status', detail: 'Reactivate only if they are still employed. Otherwise keep them inactive.' },
    { id: 'deactivate', who: 'HR', roles: ['hr_officer'], title: 'Deactivate the staff file', detail: 'Stops them being picked up on the next payroll prepare.' },
    { id: 'exclude', who: 'HR', roles: ['hr_officer', 'headteacher'], title: 'Remove from this draft', detail: 'Inactive staff must not remain on the current salary list.' },
  ],
  Payment_Without_Attendance: [
    { id: 'attendance', who: 'HR / Headteacher', roles: ['hr_officer', 'headteacher'], title: 'Check the attendance register', detail: 'Mark present, late or approved leave for the pay period.' },
    { id: 'exclude', who: 'HR', roles: ['hr_officer', 'headteacher'], title: 'Remove from this draft', detail: 'If they did not work and have no leave, they should not be paid this month.' },
  ],
  Duplicate_Period_Payment: [
    { id: 'exclude', who: 'HR', roles: ['hr_officer', 'headteacher'], title: 'Remove the extra salary line', detail: 'Keep one payment for the period. Drop this duplicate from the draft.' },
  ],
  Unusually_High_Salary: [
    { id: 'edit', who: 'HR', roles: ['hr_officer'], title: 'Check salary and grade', detail: 'Correct the basic, grade or unauthorized increment on the staff file.' },
    { id: 'recalculate', who: 'HR', roles: ['hr_officer'], title: 'Recalculate this slip', detail: 'Rebuild net pay from the corrected salary.' },
    { id: 'exclude', who: 'HR', roles: ['hr_officer', 'headteacher'], title: 'Hold this person off the run', detail: 'Remove them until HR confirms the figure in writing.' },
  ],
  Ssnit_Mismatch: [
    { id: 'edit', who: 'HR', roles: ['hr_officer'], title: 'Correct salary or SSNIT number', detail: 'Employee SSNIT must be 5.5% of capped basic.' },
    { id: 'recalculate', who: 'HR', roles: ['hr_officer'], title: 'Recalculate this slip', detail: 'Rebuild SSNIT from the current basic.' },
  ],
  Bank_Details_Missing: [
    { id: 'edit', who: 'HR', roles: ['hr_officer'], title: 'Capture bank name and account', detail: 'Payment cannot be marked paid without bank details.' },
    { id: 'exclude', who: 'HR', roles: ['hr_officer', 'headteacher'], title: 'Remove until banking is on file', detail: 'Drop them from this draft if they cannot be paid this month.' },
  ],
  Loan_Over_Deduction: [
    { id: 'edit', who: 'HR', roles: ['hr_officer'], title: 'Correct the loan ledger', detail: 'Cap monthly recovery at the outstanding balance.' },
    { id: 'recalculate', who: 'HR', roles: ['hr_officer'], title: 'Recalculate this slip', detail: 'Rebuild the loan deduction from the updated balance.' },
  ],
  Unauthorized_Allowance: [
    { id: 'edit', who: 'HR', roles: ['hr_officer'], title: 'Remove or authorize the allowance', detail: 'Unauthorised or over-cap allowances must come off the staff file.' },
    { id: 'recalculate', who: 'HR', roles: ['hr_officer'], title: 'Recalculate this slip', detail: 'Rebuild gross pay after the allowance change.' },
    { id: 'exclude', who: 'HR', roles: ['hr_officer', 'headteacher'], title: 'Hold this person off the run', detail: 'Remove them until the Headteacher authorizes the allowance.' },
  ],
}

export function playbookFor(code) {
  return rulePlaybook[code] || defaultPlaybook
}

export const severityMeta = {
  critical: { label: 'Critical', color: '#b91c1c', bg: 'bg-red-50', text: 'text-red-800', ring: 'ring-red-200' },
  high: { label: 'High', color: '#c2410c', bg: 'bg-orange-50', text: 'text-orange-800', ring: 'ring-orange-200' },
  medium: { label: 'Medium', color: '#b45309', bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
  low: { label: 'Low', color: '#475569', bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-200' },
}

export const statusLabel = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  false_positive: 'False positive',
  resolved: 'Resolved',
}

export function ruleName(code) {
  return ruleCatalogue[code]?.name || (code || '').replaceAll('_', ' ')
}

export function prettyStatus(status) {
  return statusLabel[status] || (status || '').replaceAll('_', ' ')
}

const moneyKeys = /salary|ssnit|amount|difference|outstanding|net|gross|basic|allowance|loan|penalty/i

export function evidenceRows(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return []
  return Object.entries(evidence)
    .filter(([key, value]) => value !== null && value !== undefined && !['staff_id', 'user_id', 'payroll_id'].includes(key))
    .map(([key, value]) => {
      const label = key.replaceAll('_', ' ')
      let display = value
      if (typeof value === 'boolean') display = value ? 'Yes' : 'No'
      else if (typeof value === 'number' && moneyKeys.test(key)) {
        display = `GHS ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      } else if (typeof value === 'object') display = JSON.stringify(value)
      return { key, label, display: String(display) }
    })
}
