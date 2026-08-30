export const portalRoles = [
  { slug: 'super_admin', label: 'Super Admin', hint: 'Full portal, including this users desk.' },
  { slug: 'headteacher', label: 'Headteacher', hint: 'Approves payroll and leave for the school.' },
  { slug: 'hr_officer', label: 'HR Officer', hint: 'Staff files, attendance, payroll preparation and the parent register.' },
  { slug: 'accountant', label: 'Accountant', hint: 'Read-only payroll, flags and reports.' },
  { slug: 'auditor', label: 'Auditor', hint: 'Assurance desk — audit trail and flags, no pay changes.' },
  { slug: 'teacher', label: 'Teacher', hint: 'Class, attendance, leave and parent messages.' },
  { slug: 'parent', label: 'Parent', hint: 'Household login for notices and meeting invites.' },
]

export function roleHint(slug) {
  return portalRoles.find((item) => item.slug === slug)?.hint || 'School portal account.'
}

export function initials(name) {
  return String(name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
