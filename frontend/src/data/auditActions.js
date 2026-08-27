export const sensitiveActions = [
  'payroll_run.approved',
  'payroll_run.paid',
  'payroll_run.cancelled',
  'payroll.excluded',
  'staff.deactivated',
  'anomaly.resolved',
  'anomaly.false_positive',
]

export const auditModules = [
  { id: 'all', label: 'All desks' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'anomaly', label: 'Flags' },
  { id: 'staff', label: 'Staff' },
  { id: 'leave', label: 'Leave' },
  { id: 'parent', label: 'Parents' },
  { id: 'auth', label: 'Sign-in' },
  { id: 'user', label: 'Users' },
]

export const actionCatalog = {
  'auth.login': { label: 'Signed in', hint: 'A school account opened the portal.' },
  'auth.logout': { label: 'Signed out', hint: 'The session was closed.' },
  'auth.register': { label: 'Account registered', hint: 'A new user was created from the public register form.' },
  'user.created': { label: 'User created', hint: 'An administrator added a portal account.' },
  'user.updated': { label: 'User updated', hint: 'A portal account or role was changed.' },
  'staff.created': { label: 'Staff registered', hint: 'A new employment file was opened.' },
  'staff.updated': { label: 'Staff file updated', hint: 'Bio-data, posting or payroll details were changed.' },
  'staff.deactivated': { label: 'Staff deactivated', hint: 'The employee will not be picked up on the next payroll prepare.' },
  'leave.requested': { label: 'Leave requested', hint: 'A staff member submitted the official leave form.' },
  'leave.reviewed': { label: 'Leave reviewed by HR', hint: 'HR forwarded or rejected the request.' },
  'leave.approve': { label: 'Leave approved', hint: 'The Headteacher approved the leave.' },
  'leave.reject': { label: 'Leave rejected', hint: 'The Headteacher rejected the leave.' },
  'payroll_run.executed': { label: 'Payroll prepared', hint: 'Salary slips were generated and scanned for anomalies.' },
  'payroll_run.approved': { label: 'Payroll approved', hint: 'The Headteacher signed the salary run.' },
  'payroll_run.paid': { label: 'Payroll marked paid', hint: 'Net pay was recorded as paid.' },
  'payroll_run.cancelled': { label: 'Payroll draft cancelled', hint: 'The draft run was withdrawn.' },
  'payroll.excluded': { label: 'Staff removed from a run', hint: 'A draft salary line was dropped so that person will not be paid this period.' },
  'payroll.restored': { label: 'Staff restored on a run', hint: 'An excluded draft line was put back.' },
  'payroll.recalculated': { label: 'Slip recalculated', hint: 'A draft slip was rebuilt from the current staff file.' },
  'anomaly.acknowledged': { label: 'Flag acknowledged', hint: 'The case was seen and parked for follow-up.' },
  'anomaly.resolved': { label: 'Flag resolved', hint: 'The underlying record was treated as corrected.' },
  'anomaly.false_positive': { label: 'Flag marked false positive', hint: 'The rule fired, but the pay was recorded as legitimate.' },
  'anomaly.rescanned': { label: 'Run rescanned', hint: 'Anomaly rules were run again on a salary list.' },
  'parent.created': { label: 'Parent registered', hint: 'A household email was added to the parent register.' },
  'parent.updated': { label: 'Parent file updated', hint: 'Household details or ward links were changed.' },
  'parent.message.sent': { label: 'Parent message sent', hint: 'A notice, meeting or broadcast was sent by email and/or WhatsApp.' },
}

const moduleTone = {
  payroll: { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-100', dot: 'bg-emerald-700' },
  anomaly: { bg: 'bg-amber-50', text: 'text-amber-900', ring: 'ring-amber-100', dot: 'bg-amber-500' },
  staff: { bg: 'bg-sky-50', text: 'text-sky-800', ring: 'ring-sky-100', dot: 'bg-sky-700' },
  leave: { bg: 'bg-violet-50', text: 'text-violet-800', ring: 'ring-violet-100', dot: 'bg-violet-600' },
  parent: { bg: 'bg-teal-50', text: 'text-teal-800', ring: 'ring-teal-100', dot: 'bg-teal-700' },
  auth: { bg: 'bg-stone-100', text: 'text-slate-700', ring: 'ring-stone-200', dot: 'bg-slate-500' },
  user: { bg: 'bg-indigo-50', text: 'text-indigo-800', ring: 'ring-indigo-100', dot: 'bg-indigo-600' },
}

const metaLabels = {
  staff_count: 'Staff on the run',
  student_ids: 'Ward IDs',
  type: 'Message type',
  recipients: 'Recipient IDs',
  broadcast: 'Broadcast',
  count: 'Flags written',
  status: 'Outcome',
  resolution_notes: 'Notes',
  payroll_run_id: 'Salary run',
}

export function moduleLabel(module) {
  return auditModules.find((item) => item.id === module)?.label || module
}

export function actionLabel(action) {
  return actionCatalog[action]?.label || String(action || '').replaceAll('.', ' · ').replaceAll('_', ' ')
}

export function actionHint(action) {
  return actionCatalog[action]?.hint || 'Recorded on the school audit trail.'
}

export function toneFor(module) {
  return moduleTone[module] || moduleTone.auth
}

export function prettyWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 19)
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function prettyAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 45) return 'just now'
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  const days = Math.floor(seconds / 86400)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return prettyWhen(value)
}

export function prettyClock(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function dayKey(value) {
  if (!value) return 'unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toISOString().slice(0, 10)
}

export function dayHeading(value) {
  const key = dayKey(value)
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayKey = yesterday.toISOString().slice(0, 10)
  if (key === todayKey) return 'Today'
  if (key === yesterdayKey) return 'Yesterday'
  const date = new Date(`${key}T00:00:00`)
  if (Number.isNaN(date.getTime())) return key
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function initials(name) {
  return String(name || 'SY')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function metadataRows(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      label: metaLabels[key] || key.replaceAll('_', ' '),
      display: Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value),
    }))
}
