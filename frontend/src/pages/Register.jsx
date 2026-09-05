import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi'
import api from '../api/client'
import AuthInput from '../components/AuthInput'
import AuthShell from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'
import { AUTH_HINTS, AUTH_LIMITS, sanitizeAuthValue, validateAuthForm } from '../lib/authFields'

const fallbackRoles = [
  { slug: 'super_admin', name: 'Administrator', hint: 'Full school portal, including user accounts.' },
  { slug: 'headteacher', name: 'Headteacher / Headmaster', hint: 'Approves leave and payroll for the school.' },
  { slug: 'hr_officer', name: 'HR Officer', hint: 'Staff files, attendance, payroll preparation and the parent register.' },
  { slug: 'auditor', name: 'Auditor', hint: 'Audit trail and payroll flags — no pay changes.' },
]

const empty = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
  role: 'headteacher',
  captcha: '',
}

const registerFields = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'password',
  'password_confirmation',
  'captcha',
  'role',
]

export default function Register() {
  const { user, register } = useAuth()
  const [roles, setRoles] = useState(fallbackRoles)
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [challenge, setChallenge] = useState({ id: '', svg: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  const loadCaptcha = async () => {
    try {
      const { data } = await api.get('/auth/captcha')
      setChallenge({ id: data.id, svg: data.svg })
      setForm((current) => ({ ...current, captcha: '' }))
      setErrors((current) => ({ ...current, captcha: '' }))
    } catch {
      toast.error('Could not load the security code')
    }
  }

  useEffect(() => {
    api.get('/auth/register-roles').then(({ data }) => {
      if (Array.isArray(data) && data.length) setRoles(data)
    }).catch(() => {})
    loadCaptcha()
  }, [])

  if (user) return <Navigate to="/" replace />

  const set = (key, value) => {
    const next = sanitizeAuthValue(key, value)
    setForm((current) => ({ ...current, [key]: next }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validateAuthForm(registerFields, form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast.error('Check the highlighted fields before registering')
      return
    }
    if (!challenge.id) {
      toast.error('Refresh the security code and try again')
      return
    }
    setBusy(true)
    try {
      await register({ ...form, captcha_id: challenge.id, captcha: form.captcha.trim() })
      toast.success('Officer account created')
    } catch (error) {
      const apiErrors = error.response?.data?.errors || {}
      const mapped = {}
      Object.entries(apiErrors).forEach(([key, messages]) => {
        mapped[key] = messages?.[0] || ''
      })
      setErrors(mapped)
      const first = Object.values(apiErrors)[0]?.[0]
      toast.error(first || error.response?.data?.message || 'Could not register')
      await loadCaptcha()
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} noValidate className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl shadow-emerald-950/5 ring-1 ring-stone-200 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">First-time officers</p>
        <h2 className="mt-2 text-2xl font-semibold text-emerald-950 sm:text-3xl">Create an account</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Administrators, HR officers, auditors and headteachers / headmasters may register with their own credentials. Teachers and other staff are enrolled by HR.
        </p>

        <label className="mt-6 block text-sm font-medium text-slate-700">Desk</label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <button
              key={role.slug}
              type="button"
              onClick={() => set('role', role.slug)}
              className={`rounded-xl border px-3 py-2 text-left text-xs transition ${form.role === role.slug ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'border-stone-200 hover:border-emerald-300'}`}
            >
              <span className="block font-semibold">{role.name}</span>
              <span className="mt-0.5 block text-slate-500">{role.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AuthInput
            id="first_name"
            name="first_name"
            label="First name"
            value={form.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            type="text"
            inputMode="text"
            autoComplete="given-name"
            autoCapitalize="words"
            maxLength={AUTH_LIMITS.name}
            hint={AUTH_HINTS.first_name}
            error={errors.first_name}
            required
          />
          <AuthInput
            id="last_name"
            name="last_name"
            label="Surname"
            value={form.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            type="text"
            inputMode="text"
            autoComplete="family-name"
            autoCapitalize="words"
            maxLength={AUTH_LIMITS.name}
            hint={AUTH_HINTS.last_name}
            error={errors.last_name}
            required
          />
        </div>

        <div className="mt-4">
          <AuthInput
            id="register_email"
            name="email"
            label="School email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={AUTH_LIMITS.email}
            placeholder="name@school.gh"
            hint={AUTH_HINTS.email}
            error={errors.email}
            required
          />
        </div>

        <div className="mt-4">
          <AuthInput
            id="phone"
            name="phone"
            label="Phone"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={AUTH_LIMITS.phone}
            placeholder="024XXXXXXX"
            hint={AUTH_HINTS.phone}
            error={errors.phone}
            required
          />
        </div>

        <div className="mt-4">
          <label htmlFor="register_password" className="block text-sm font-medium text-slate-700">Password</label>
          <div className="relative mt-1">
            <input
              id="register_password"
              name="password"
              className={`input pr-11 ${errors.password ? 'input-error' : ''}`}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              maxLength={AUTH_LIMITS.password}
              aria-invalid={errors.password ? 'true' : 'false'}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-emerald-800"
              onClick={() => setShowPassword((open) => !open)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          {errors.password ? (
            <p className="mt-1 text-xs text-rose-700">{errors.password}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">{AUTH_HINTS.password}</p>
          )}
        </div>

        <div className="mt-4">
          <AuthInput
            id="password_confirmation"
            name="password_confirmation"
            label="Confirm password"
            value={form.password_confirmation}
            onChange={(e) => set('password_confirmation', e.target.value)}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={8}
            maxLength={AUTH_LIMITS.password}
            hint={AUTH_HINTS.password_confirmation}
            error={errors.password_confirmation}
            required
          />
        </div>

        <label htmlFor="captcha" className="mt-4 block text-sm font-medium text-slate-700">Security code</label>
        <p className="mt-1 text-xs text-slate-400">Type the five letters or numbers from the picture so we know a person is registering this desk.</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="overflow-hidden rounded-xl ring-1 ring-stone-200">
            {challenge.svg ? (
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(challenge.svg)}`}
                alt="Registration CAPTCHA"
                width={180}
                height={56}
                className="block h-14 w-[180px] bg-[#f4f1ea]"
              />
            ) : (
              <div className="grid h-14 w-[180px] place-items-center text-xs text-slate-400">Loading…</div>
            )}
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm text-emerald-900 hover:bg-stone-50"
            onClick={loadCaptcha}
          >
            <FiRefreshCw /> New code
          </button>
        </div>
        <AuthInput
          id="captcha"
          name="captcha"
          value={form.captcha}
          onChange={(e) => set('captcha', e.target.value)}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={AUTH_LIMITS.captcha}
          pattern="[A-Za-z0-9]{5}"
          placeholder="ENTER CODE"
          className="uppercase tracking-[0.28em]"
          hint={AUTH_HINTS.captcha}
          error={errors.captcha}
          required
        />

        <button className="btn-primary mt-6 w-full py-2.5 text-base" disabled={busy}>
          {busy ? 'Creating account…' : 'Register and open portal'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-emerald-800 hover:underline">Sign in with email</Link>
          {' · '}
          <Link to="/login?desk=staff" className="font-medium text-emerald-800 hover:underline">Staff ID login</Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <a href="/School-SMS-User-Manual.pdf" download="School-SMS-User-Manual.pdf" className="font-medium text-emerald-800 hover:underline">
            Download the user manual (PDF)
          </a>
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          Parents cannot register here. HR adds the household on the parent register, then the parent signs in with that email.
        </p>
      </form>
    </AuthShell>
  )
}
