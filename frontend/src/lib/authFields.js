/** Shared input-type rules for login and officer registration. */

export const AUTH_LIMITS = {
  name: 100,
  email: 255,
  phone: 16,
  password: 72,
  employeeId: 50,
  captcha: 5,
}

export const AUTH_HINTS = {
  first_name: 'Letters only — spaces, hyphen or apostrophe allowed.',
  last_name: 'Letters only — spaces, hyphen or apostrophe allowed.',
  email: 'Use a valid school email, e.g. name@school.gh',
  phone: 'Ghana mobile, e.g. 024XXXXXXX or +233XXXXXXXXX.',
  password: 'At least 8 characters (max 72).',
  password_confirmation: 'Re-enter the same password.',
  employee_id: 'Letters, numbers and hyphens, e.g. SMS-2026-0001.',
  captcha: 'Five characters from the picture.',
}

const NAME_RE = /^[\p{L}][\p{L} .'-]{1,99}$/u
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const EMPLOYEE_ID_RE = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/
const CAPTCHA_RE = /^[A-Za-z0-9]{5}$/

export function ghanaPhoneDigits(value) {
  let digits = String(value || '').replace(/\D+/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('233') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 10) return `233${digits.slice(1)}`
  if (digits.length === 9) return `233${digits}`
  return null
}

export function sanitizeAuthValue(field, raw) {
  const value = String(raw ?? '')
  switch (field) {
    case 'first_name':
    case 'last_name':
      return value.replace(/[^\p{L} .'-]/gu, '').slice(0, AUTH_LIMITS.name)
    case 'email':
      return value.replace(/\s+/g, '').replace(/[^A-Za-z0-9._%+\-@]/g, '').slice(0, AUTH_LIMITS.email)
    case 'phone':
      return value.replace(/[^\d+\s-]/g, '').slice(0, AUTH_LIMITS.phone)
    case 'employee_id':
      return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, AUTH_LIMITS.employeeId)
    case 'captcha':
      return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, AUTH_LIMITS.captcha)
    case 'password':
    case 'password_confirmation':
      return value.slice(0, AUTH_LIMITS.password)
    default:
      return value
  }
}

export function validateAuthField(field, value, form = {}) {
  const trimmed = String(value ?? '').trim()

  switch (field) {
    case 'first_name':
    case 'last_name':
      if (!trimmed) return 'This name is required.'
      if (trimmed.length < 2) return 'Enter at least 2 letters.'
      if (!NAME_RE.test(trimmed)) return AUTH_HINTS[field]
      return ''
    case 'email':
      if (!trimmed) return 'Email is required.'
      if (!EMAIL_RE.test(trimmed)) return AUTH_HINTS.email
      return ''
    case 'phone':
      if (!trimmed) return 'Phone number is required.'
      if (!ghanaPhoneDigits(trimmed)) return AUTH_HINTS.phone
      return ''
    case 'employee_id':
      if (!trimmed) return 'Staff ID is required.'
      if (trimmed.length < 3 || trimmed.length > AUTH_LIMITS.employeeId || !EMPLOYEE_ID_RE.test(trimmed)) {
        return AUTH_HINTS.employee_id
      }
      return ''
    case 'password':
      if (!trimmed) return 'Password is required.'
      if (trimmed.length < 8) return 'Use at least 8 characters.'
      if (trimmed.length > AUTH_LIMITS.password) return 'Password is too long.'
      return ''
    case 'password_confirmation':
      if (!trimmed) return 'Confirm your password.'
      if (trimmed !== String(form.password ?? '')) return 'Password confirmation does not match.'
      return ''
    case 'captcha':
      if (!trimmed) return 'Enter the security code.'
      if (!CAPTCHA_RE.test(trimmed)) return AUTH_HINTS.captcha
      return ''
    case 'role':
      if (!trimmed) return 'Choose a desk.'
      return ''
    default:
      return ''
  }
}

export function validateAuthForm(fields, form) {
  const errors = {}
  fields.forEach((field) => {
    const message = validateAuthField(field, form[field], form)
    if (message) errors[field] = message
  })
  return errors
}
