import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiChevronLeft, FiChevronRight, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

const slides = [
  {
    src: '/slides/school-building.jpg',
    title: 'School campus',
    caption: 'A welcoming basic-school compound for pupils, teachers and administrators.',
  },
  {
    src: '/slides/classroom.jpg',
    title: 'Classrooms',
    caption: 'Bright classrooms where daily lessons and attendance are recorded.',
  },
  {
    src: '/slides/teacher.jpg',
    title: 'Teachers',
    caption: 'Classroom teachers whose salaries, SSNIT and allowances must be paid accurately.',
  },
  {
    src: '/slides/teaching.jpg',
    title: 'Teaching in session',
    caption: 'Staff time on duty is checked against payroll before salaries are released.',
  },
  {
    src: '/slides/pupils.jpg',
    title: 'Pupils at work',
    caption: 'The reason the school exists — protected by transparent staff payroll.',
  },
  {
    src: '/slides/staff.jpg',
    title: 'School staff',
    caption: 'Headteachers, HR, payroll officers and auditors working from one portal.',
  },
]

const demos = [
  ['admin@school.gh', 'Super Admin'],
  ['head@school.gh', 'Headteacher'],
  ['hr@school.gh', 'HR Officer'],
  ['payroll@school.gh', 'Payroll Officer'],
  ['auditor@school.gh', 'Auditor'],
  ['teacher@school.gh', 'Teacher'],
  ['parent@school.gh', 'Parent'],
]

export default function Login() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('admin@school.gh')
  const [password, setPassword] = useState('password')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return undefined
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % slides.length)
    }, 5500)
    return () => clearInterval(timer)
  }, [paused])

  if (user) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      await login(email, password)
      toast.success('Welcome back')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  const go = (direction) => {
    setActive((current) => (current + direction + slides.length) % slides.length)
  }

  return (
    <div className="min-h-dvh bg-[#f4f1ea] lg:grid lg:grid-cols-2">
      <section
        className="relative h-52 overflow-hidden sm:h-80 lg:h-auto lg:min-h-dvh"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((slide, index) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.title}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === active ? 'login-slide-active opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/45 to-emerald-950/20" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-5 lg:p-8">
          <div className="flex min-w-0 items-center gap-3 text-white">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-400 font-bold text-emerald-950 shadow">
              SMS
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">School Management System</p>
              <p className="text-xs text-emerald-100">Ghana basic schools · GES</p>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">{slides[active].title}</p>
          <h1 className="mt-2 max-w-xl text-xl font-semibold leading-snug text-white sm:text-2xl lg:text-4xl">
            Staff payroll portal for Ghanaian basic schools
          </h1>
          <p className="mt-3 max-w-lg text-sm text-emerald-50 lg:text-base">{slides[active].caption}</p>
          <div className="mt-5 flex items-center gap-3">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" onClick={() => go(-1)} aria-label="Previous photo">
              <FiChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.src}
                  type="button"
                  aria-label={slide.title}
                  onClick={() => setActive(index)}
                  className={`h-2 rounded-full transition-all ${index === active ? 'w-8 bg-amber-400' : 'w-2 bg-white/50 hover:bg-white'}`}
                />
              ))}
            </div>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" onClick={() => go(1)} aria-label="Next photo">
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-8">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl shadow-emerald-950/5 ring-1 ring-stone-200 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">Authorized staff only</p>
          <h2 className="mt-2 text-2xl font-semibold text-emerald-950 sm:text-3xl">Sign in</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Enter your school email to open the payroll, attendance and anomaly dashboard.
          </p>

          <label className="mt-7 block text-sm font-medium text-slate-700">School email</label>
          <input
            className="input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
            placeholder="name@school.gh"
            required
          />

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

          <button className="btn-primary mt-6 w-full py-2.5 text-base" disabled={busy}>
            {busy ? 'Signing in…' : 'Continue to portal'}
          </button>

          <div className="mt-7 border-t border-stone-100 pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Quick access roles</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {demos.map(([demoEmail, label]) => (
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
            <p className="mt-3 text-center text-xs text-slate-400">Demo password: password</p>
          </div>
        </form>
      </section>
    </div>
  )
}
