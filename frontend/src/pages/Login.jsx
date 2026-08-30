import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import AuthShell from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'

const officerDemos = [
  ['admin@school.gh', 'Administrator'],
  ['head@school.gh', 'Headteacher'],
  ['hr@school.gh', 'HR Officer'],
  ['auditor@school.gh', 'Auditor'],
  ['parent@school.gh', 'Parent'],
]

const staffDemos = [
  ['EMP-1001', 'teacher@school.gh', 'Teacher'],
  ['EMP-ACC-01', 'accounts@school.gh', 'Accountant'],
]

export default function Login() {
  const { user, login, loginStaff } = useAuth()
  const [params, setParams] = useSearchParams()
  const mode = params.get('desk') === 'staff' ? 'staff' : 'officer'
  const [email, setEmail] = useState(mode === 'staff' ? 'teacher@school.gh' : 'admin@school.gh')
  const [employeeId, setEmployeeId] = useState('EMP-1001')
  const [password, setPassword] = useState('password')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const setMode = (next) => {
    const copy = new URLSearchParams(params)
    if (next === 'staff') copy.set('desk', 'staff')
    else copy.delete('desk')
    setParams(copy, { replace: true })
    if (next === 'staff') {
      setEmployeeId('EMP-1001')
      setEmail('teacher@school.gh')
    } else {
      setEmail('admin@school.gh')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      if (mode === 'staff') {
        await loginStaff(employeeId, email)
      } else {
        await login(email, password)
      }
      toast.success('Welcome back')
    } catch (error) {
      const errors = error.response?.data?.errors || {}
      toast.error(errors.employee_id?.[0] || errors.email?.[0] || error.response?.data?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl shadow-emerald-950/5 ring-1 ring-stone-200 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">Role-based access</p>
        <h2 className="mt-2 text-2xl font-semibold text-emerald-950 sm:text-3xl">Sign in</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Parents, administrators, HR, auditors and headteachers sign in with email and password. Teachers and accountants use the staff ID issued at employment and the email on their file — no password.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setMode('officer')}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === 'officer' ? 'bg-white text-emerald-950 shadow' : 'text-slate-500'}`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setMode('staff')}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === 'staff' ? 'bg-white text-emerald-950 shadow' : 'text-slate-500'}`}
          >
            Staff ID
          </button>
        </div>

        {mode === 'staff' ? (
          <>
            <label className="mt-6 block text-sm font-medium text-slate-700">Staff ID</label>
            <input
              className="input mt-1 font-medium tracking-wide"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              autoComplete="username"
              placeholder="SMS-2026-0001"
              required
            />
            <label className="mt-4 block text-sm font-medium text-slate-700">Employment email</label>
            <input
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="name@school.gh"
              required
            />
          </>
        ) : (
          <>
            <label className="mt-6 block text-sm font-medium text-slate-700">Email</label>
            <input
              className="input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              placeholder="name@school.gh"
              required
            />
          </>
        )}

        {mode === 'officer' && (
          <>
            <label className="mt-4 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative mt-1">
              <input
                className="input pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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
          </>
        )}

        <button className="btn-primary mt-6 w-full py-2.5 text-base" disabled={busy}>
          {busy ? 'Signing in…' : 'Continue to portal'}
        </button>
        <a
          href="/School-SMS-User-Manual.pdf"
          download="School-SMS-User-Manual.pdf"
          className="mt-3 block text-center text-sm font-medium text-emerald-800 hover:underline"
        >
          Download the user manual (PDF)
        </a>

        {mode === 'officer' ? (
          <p className="mt-4 text-center text-sm text-slate-500">
            First time as Administrator, HR, Auditor or Headteacher?{' '}
            <Link to="/register" className="font-medium text-emerald-800 hover:underline">Create an officer account</Link>
            <span className="mt-1 block">Parents do not self-register. Ask HR to add you on the parent register, then sign in here with that email.</span>
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-slate-500">
            Staff cannot self-register. Ask HR to complete your employment file, then sign in with the generated staff ID and that email.
          </p>
        )}

        <div className="mt-7 border-t border-stone-100 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {mode === 'staff' ? 'Demo staff logins' : 'Demo email logins'}
          </p>
          {mode === 'staff' ? (
            <div className="mt-3 grid grid-cols-1 gap-2">
              {staffDemos.map(([id, demoEmail, label]) => (
                <button
                  type="button"
                  key={id}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition ${employeeId === id ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'border-stone-200 hover:border-emerald-300 hover:bg-stone-50'}`}
                  onClick={() => {
                    setEmployeeId(id)
                    setEmail(demoEmail)
                  }}
                >
                  <span className="block font-semibold">{label}</span>
                  <span className="text-slate-500">{id} · {demoEmail}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {officerDemos.map(([demoEmail, label]) => (
                <button
                  type="button"
                  key={demoEmail}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition ${email === demoEmail ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'border-stone-200 hover:border-emerald-300 hover:bg-stone-50'}`}
                  onClick={() => setEmail(demoEmail)}
                >
                  <span className="block font-semibold">{label}</span>
                  <span className="break-all text-slate-500">{demoEmail}</span>
                </button>
              ))}
            </div>
          )}
            {mode === 'staff' && (
              <p className="mt-3 text-center text-xs text-slate-400">No password — use the issued staff ID and the email on the employment file.</p>
            )}
            {mode === 'officer' && (
              <p className="mt-3 text-center text-xs text-slate-400">Demo password: password</p>
            )}
        </div>
      </form>
    </AuthShell>
  )
}
