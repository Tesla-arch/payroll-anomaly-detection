import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiMail,
  FiPause,
  FiPlay,
  FiShield,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi'
import api from '../api/client'
import { academicSlides } from '../data/academicSlides'
import { useAuth } from '../context/AuthContext'

const severityMeta = {
  critical: { label: 'Critical', color: '#b91c1c', bg: 'bg-red-50', text: 'text-red-800', ring: 'ring-red-200' },
  high: { label: 'High', color: '#c2410c', bg: 'bg-orange-50', text: 'text-orange-800', ring: 'ring-orange-200' },
  medium: { label: 'Medium', color: '#b45309', bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
  low: { label: 'Low', color: '#475569', bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-200' },
}

const campusMap = [
  { target: 'classrooms', top: '42%', left: '28%', label: 'Classrooms' },
  { target: 'library', top: '36%', left: '72%', label: 'Library' },
  { target: 'assembly', top: '68%', left: '48%', label: 'Assembly' },
  { target: 'staff', top: '30%', left: '58%', label: 'Offices' },
]

export function SeverityBadge({ value }) {
  const meta = severityMeta[value] || severityMeta.low
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${meta.bg} ${meta.text}`}>
      {value}
    </span>
  )
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 16) return 'Good afternoon'
  return 'Good evening'
}

function healthCopy(critical, open) {
  if (critical > 0) {
    return {
      label: 'Hold payroll',
      detail: `${critical} critical flag${critical === 1 ? '' : 's'} must be reviewed before salaries can be approved.`,
    }
  }
  if (open > 0) {
    return {
      label: 'Review recommended',
      detail: `${open} open anomal${open === 1 ? 'y needs' : 'ies need'} attention before the next payment run.`,
    }
  }
  return {
    label: 'Clear to proceed',
    detail: 'No open payroll flags. Attendance, leave and payslips look ready for review.',
  }
}

function CampusHero({ user, hasRole, stats, health }) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hoverPin, setHoverPin] = useState(null)
  const slide = academicSlides[active]
  const canOpen = !slide.roles || hasRole(...slide.roles)

  useEffect(() => {
    if (paused) return undefined
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % academicSlides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [paused])

  const go = (direction) => {
    setActive((current) => (current + direction + academicSlides.length) % academicSlides.length)
  }

  const jumpTo = (id) => {
    const index = academicSlides.findIndex((item) => item.id === id)
    if (index >= 0) setActive(index)
  }

  return (
    <section className="space-y-4">
      <div
        className="relative overflow-hidden rounded-3xl shadow-lg shadow-emerald-950/15"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          setPaused(false)
          setHoverPin(null)
        }}
      >
        <div className="relative min-h-80 h-80 sm:h-[28rem] lg:h-[32rem]">
          {academicSlides.map((item, index) => (
            <img
              key={item.id}
              src={item.src}
              alt={item.title}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === active ? 'hero-slide-active opacity-100' : 'opacity-0'}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/45 to-emerald-950/15" />

          {slide.id === 'campus' && campusMap.map((pin) => (
            <button
              key={pin.target}
              type="button"
              className="absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 sm:block"
              style={{ top: pin.top, left: pin.left }}
              onMouseEnter={() => setHoverPin(pin.target)}
              onMouseLeave={() => setHoverPin(null)}
              onClick={() => jumpTo(pin.target)}
              aria-label={`Explore ${pin.label}`}
            >
              <span className="campus-hotspot absolute inset-0 -m-2 rounded-full bg-amber-300/70" />
              <span className="relative grid h-4 w-4 place-items-center rounded-full bg-amber-400 ring-4 ring-white/40" />
              <span className={`absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-emerald-950/90 px-3 py-1 text-xs font-medium text-white shadow ${hoverPin === pin.target ? 'opacity-100' : 'opacity-0 sm:opacity-80'}`}>
                {pin.label}
              </span>
            </button>
          ))}

          {slide.id !== 'campus' && slide.hotspot && (
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ top: slide.hotspot.top, left: slide.hotspot.left }}
            >
              <span className="campus-hotspot absolute inset-0 -m-2 rounded-full bg-amber-300/70" />
              <span className="relative grid h-4 w-4 place-items-center rounded-full bg-amber-400 ring-4 ring-white/30" />
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 sm:gap-4 sm:p-8">
            <div className="max-w-xl min-w-0 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">{greeting()}</p>
              <h3 className="mt-2 text-2xl font-semibold [overflow-wrap:anywhere] sm:text-4xl">{user?.first_name}, welcome back</h3>
              <p className="mt-2 text-sm text-emerald-50 sm:text-base">
                Signed in as {user?.role?.name}. {health.detail}
              </p>
            </div>
            <div className="hidden rounded-2xl bg-white/10 px-5 py-4 text-white backdrop-blur sm:block">
              <p className="text-xs uppercase tracking-wide text-emerald-100">Payroll health</p>
              <p className="mt-1 text-2xl font-semibold">{health.label}</p>
              <p className="mt-1 text-sm text-emerald-100">
                {stats.open_anomalies || 0} open · {stats.critical_anomalies || 0} critical
              </p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">{slide.title}</p>
            <p className="mt-2 max-w-xl text-sm text-emerald-50 sm:text-base">{slide.caption}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {canOpen && slide.to !== '/' && (
                <Link to={slide.to} className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-amber-300">
                  {slide.action} <FiArrowRight />
                </Link>
              )}
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur">
                {slide.metricLabel}: {stats[slide.metricKey] ?? '—'}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" onClick={() => go(-1)} aria-label="Previous campus photo">
                  <FiChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
                  onClick={() => setPaused((value) => !value)}
                  aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
                >
                  {paused ? <FiPlay size={16} /> : <FiPause size={16} />}
                </button>
                <div className="hidden gap-1.5 sm:flex">
                  {academicSlides.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={item.title}
                      onClick={() => setActive(index)}
                      className={`h-2 rounded-full transition-all ${index === active ? 'w-8 bg-amber-400' : 'w-2 bg-white/50 hover:bg-white'}`}
                    />
                  ))}
                </div>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" onClick={() => go(1)} aria-label="Next campus photo">
                  <FiChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {academicSlides.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(index)}
            className={`group relative h-28 w-40 shrink-0 overflow-hidden rounded-2xl text-left ring-2 transition ${index === active ? 'ring-amber-400' : 'ring-transparent hover:ring-emerald-300'}`}
          >
            <img src={item.src} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-2 text-xs font-medium text-white">{item.title}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default function Dashboard() {
  const { user, role, hasRole } = useAuth()
  const [data, setData] = useState(null)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [focusSeverity, setFocusSeverity] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    api.get('/dashboard').then(({ data: payload }) => setData(payload))
  }, [])

  const stats = data?.stats || {}
  const severity = data?.open_by_severity || { critical: 0, high: 0, medium: 0, low: 0 }
  const anomalies = data?.recent_anomalies || []
  const filtered = anomalies.filter((item) => severityFilter === 'all' || item.severity === severityFilter)
  const selected = anomalies.find((item) => item.id === selectedId) || filtered[0]
  const health = healthCopy(stats.critical_anomalies || 0, stats.open_anomalies || 0)
  const attendance = data?.attendance_today || {}
  const latest = data?.latest_run

  const donut = useMemo(() => {
    const parts = ['critical', 'high', 'medium', 'low'].map((key) => ({
      key,
      value: severity[key] || 0,
      ...severityMeta[key],
    }))
    const total = parts.reduce((sum, part) => sum + part.value, 0) || 1
    let offset = 0
    return parts.map((part) => {
      const length = (part.value / total) * 100
      const slice = { ...part, length, offset }
      offset += length
      return slice
    })
  }, [severity])

  const actions = [
    hasRole('payroll_officer') && { to: '/payroll/prepare', label: 'Prepare payroll', icon: FiBarChart2 },
    hasRole('payroll_officer', 'auditor', 'headteacher') && { to: '/anomalies', label: 'Investigate flags', icon: FiAlertTriangle },
    hasRole('hr_officer', 'headteacher', 'teacher', 'payroll_officer') && { to: '/attendance', label: 'Staff attendance', icon: FiCalendar },
    hasRole('hr_officer') && { to: '/staff', label: 'Manage staff', icon: FiUserCheck },
    hasRole('hr_officer') && { to: '/anomalies', label: 'Fix flagged staff', icon: FiAlertTriangle },
    hasRole('headteacher') && { to: '/leave', label: 'Approve leave', icon: FiClipboard },
    hasRole('teacher') && { to: '/my-class', label: 'My class', icon: FiUsers },
    hasRole('teacher', 'parent') && { to: '/students', label: 'Student records', icon: FiUsers },
    hasRole('hr_officer', 'headteacher', 'teacher') && { to: '/parents', label: 'Message parents', icon: FiMail },
    role === 'super_admin' && { to: '/users/create', label: 'Create user', icon: FiUserPlus },
    hasRole('auditor') && { to: '/audit', label: 'Open audit trail', icon: FiShield },
  ].filter(Boolean)

  const maxRule = Math.max(1, ...(data?.open_by_rule || []).map((row) => row.total))

  return (
    <div className="space-y-6">
      <CampusHero user={user} hasRole={hasRole} stats={stats} health={health} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          hasRole('hr_officer', 'headteacher', 'payroll_officer', 'accountant', 'auditor') && { label: 'Active staff', value: stats.active_staff, hint: `${stats.staff || 0} on register`, to: '/staff', icon: FiUserCheck },
          hasRole('hr_officer', 'headteacher', 'teacher', 'parent') && { label: 'Students', value: stats.students, hint: 'Basic school roll', to: '/students', icon: FiUsers },
          hasRole('hr_officer', 'headteacher', 'teacher') && { label: 'Parents', value: stats.parents, hint: 'Registered emails', to: '/parents', icon: FiMail },
          hasRole('payroll_officer', 'headteacher', 'accountant', 'auditor') && { label: 'Open flags', value: stats.open_anomalies, hint: 'Awaiting review', to: '/anomalies?status=open', icon: FiAlertTriangle, warn: stats.open_anomalies > 0 },
          hasRole('payroll_officer', 'headteacher', 'accountant', 'auditor') && { label: 'Critical', value: stats.critical_anomalies, hint: 'Blocks approval', to: '/anomalies?status=open&severity=critical', icon: FiShield, danger: stats.critical_anomalies > 0 },
          hasRole('hr_officer', 'headteacher', 'teacher') && { label: 'Leave queue', value: stats.pending_leave, hint: 'HR / Headteacher', to: '/leave', icon: FiClipboard },
        ].filter(Boolean).map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className={`group card transition hover:-translate-y-0.5 hover:shadow-md ${card.danger ? 'ring-red-200' : card.warn ? 'ring-amber-200' : 'hover:ring-emerald-300'}`}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-500">{card.label}</p>
              <card.icon className={card.danger ? 'text-red-600' : 'text-emerald-700'} />
            </div>
            <p className={`mt-3 text-3xl font-semibold ${card.danger ? 'text-red-700' : 'text-emerald-950'}`}>
              {card.value ?? '—'}
            </p>
            <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-emerald-950">Open flags by severity</h4>
            <Link to="/anomalies?status=open" className="text-xs font-medium text-emerald-700">View all</Link>
          </div>
          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <svg viewBox="0 0 42 42" className="h-32 w-32 shrink-0 -rotate-90 sm:h-36 sm:w-36">
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--line)" strokeWidth="6" />
              {donut.map((slice) => (
                <circle
                  key={slice.key}
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={focusSeverity && focusSeverity !== slice.key ? 4 : 6}
                  strokeDasharray={`${slice.length} ${100 - slice.length}`}
                  strokeDashoffset={-slice.offset}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setFocusSeverity(slice.key)}
                  onMouseLeave={() => setFocusSeverity(null)}
                  onClick={() => setSeverityFilter(slice.key)}
                />
              ))}
            </svg>
            <ul className="w-full space-y-2 text-sm sm:w-auto">
              {donut.map((slice) => (
                <li key={slice.key}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-4 rounded-lg px-2 py-1 text-left ${focusSeverity === slice.key || severityFilter === slice.key ? 'bg-stone-100' : ''}`}
                    onMouseEnter={() => setFocusSeverity(slice.key)}
                    onMouseLeave={() => setFocusSeverity(null)}
                    onClick={() => setSeverityFilter(severityFilter === slice.key ? 'all' : slice.key)}
                  >
                    <span className="flex items-center gap-2 capitalize">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                      {slice.key}
                    </span>
                    <strong>{slice.value}</strong>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-xs text-slate-400">Click a slice or label to filter the live queue.</p>
        </div>

        <div className="card xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-semibold text-emerald-950">Investigation queue</h4>
            <div className="flex flex-wrap gap-2">
              {['all', 'critical', 'high', 'medium', 'low'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSeverityFilter(key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${severityFilter === key ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-2">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${selected?.id === item.id ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200 hover:border-emerald-300 hover:bg-stone-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-emerald-950">{item.rule_code.replaceAll('_', ' ')}</p>
                    <SeverityBadge value={item.severity} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.staff?.employee_id || 'Unlinked staff'} · {item.status.replace('_', ' ')}</p>
                </button>
              ))}
              {!filtered.length && <p className="py-8 text-center text-sm text-slate-400">No flags in this filter.</p>}
            </div>
            <div className="rounded-2xl bg-stone-50 p-4 lg:col-span-3">
              {selected ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Selected case</p>
                  <h5 className="text-lg font-semibold text-emerald-950">{selected.title}</h5>
                  <p className="text-sm leading-relaxed text-slate-600">{selected.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-200">Risk {Number(selected.risk_score || 0).toFixed(0)}</span>
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-200">Confidence {Number(selected.confidence_score || 0).toFixed(0)}%</span>
                    <span className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-200">{selected.payroll_run?.run_name}</span>
                  </div>
                  {selected.recommended_action && (
                    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{selected.recommended_action}</p>
                  )}
                  <Link to={`/anomalies/${selected.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
                    Open full investigation <FiArrowRight />
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Select a flag to read the evidence and recommended action.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <h4 className="font-semibold text-emerald-950">Quick actions</h4>
          <p className="mt-1 text-sm text-slate-500">Shortcuts for the {user?.role?.name} desk.</p>
          <div className="mt-4 grid gap-2">
            {actions.map((action) => (
              <Link key={action.label} to={action.to} className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-3 text-sm hover:border-emerald-400 hover:bg-emerald-50">
                <span className="inline-flex items-center gap-2 font-medium text-emerald-950">
                  <action.icon className="text-emerald-700" /> {action.label}
                </span>
                <FiArrowRight className="text-slate-400" />
              </Link>
            ))}
            {!actions.length && (
              <p className="text-sm text-slate-400">No extra actions for this role.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold text-emerald-950">Today&apos;s attendance</h4>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              ['Present', attendance.present, 'text-emerald-800'],
              ['Absent', attendance.absent, 'text-red-700'],
              ['On leave', attendance.on_leave, 'text-amber-700'],
            ].map(([label, value, cls]) => (
              <div key={label} className="rounded-xl bg-stone-50 py-4">
                <p className={`text-2xl font-semibold ${cls}`}>{value ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">{attendance.marked || 0} staff already marked today.</p>
          <Link to="/attendance" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
            Open attendance <FiArrowRight />
          </Link>
        </div>

        <div className="card">
          <h4 className="font-semibold text-emerald-950">Latest payroll run</h4>
          {latest ? (
            <div className="mt-4 space-y-3">
              <p className="text-lg font-semibold text-emerald-950">{latest.run_name}</p>
              <p className="text-sm text-slate-500">{latest.pay_period_start} – {latest.pay_period_end}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs text-slate-400">Net pay</p>
                  <p className="font-semibold">GHS {Number(latest.total_net || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs text-slate-400">Status</p>
                  <p className="font-semibold capitalize">{latest.status?.replace('_', ' ')}</p>
                </div>
              </div>
              <Link to={`/payroll/${latest.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
                Open run <FiArrowRight />
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No payroll run yet.</p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h4 className="font-semibold text-emerald-950">Rules driving open flags</h4>
          <div className="mt-4 space-y-3">
            {(data?.open_by_rule || []).map((row) => (
              <button
                key={row.rule_code}
                type="button"
                className="block w-full text-left"
                onClick={() => setSeverityFilter('all')}
              >
                <div className="mb-1 flex justify-between text-sm">
                  <span>{row.rule_code.replaceAll('_', ' ')}</span>
                  <strong>{row.total}</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${(row.total / maxRule) * 100}%` }} />
                </div>
              </button>
            ))}
            {!data?.open_by_rule?.length && <p className="text-sm text-slate-400">No open rules right now.</p>}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-emerald-950">Alerts</h4>
            {(data?.notifications || []).some((item) => !item.is_read) && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">New</span>
            )}
          </div>
          <ul className="mt-4 space-y-3">
            {(data?.notifications || []).map((note) => (
              <li key={note.id} className="rounded-xl border border-stone-200 px-3 py-3">
                <p className="text-sm font-medium text-emerald-950">{note.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{note.message}</p>
              </li>
            ))}
            {!data?.notifications?.length && (
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <FiCheckCircle /> No new alerts
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  )
}
