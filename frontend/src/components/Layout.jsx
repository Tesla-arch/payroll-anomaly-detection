import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiDownload,
  FiGrid,
  FiHome,
  FiLogOut,
  FiMail,
  FiMenu,
  FiShield,
  FiUserCheck,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import api from '../api/client'

const links = [
  { to: '/', label: 'Dashboard', icon: FiHome, roles: null },
  { to: '/my-class', label: 'My class', icon: FiBookOpen, roles: ['super_admin', 'teacher'] },
  { to: '/classes', label: 'Classes', icon: FiGrid, roles: ['super_admin', 'headteacher', 'hr_officer'] },
  { to: '/staff', label: 'Staff', icon: FiUserCheck, roles: ['super_admin', 'headteacher', 'hr_officer', 'payroll_officer', 'accountant', 'auditor'] },
  { to: '/students', label: 'Students', icon: FiUsers, roles: ['super_admin', 'headteacher', 'hr_officer', 'teacher', 'parent'] },
  { to: '/parents', label: 'Parents', icon: FiMail, roles: ['super_admin', 'headteacher', 'hr_officer', 'teacher'] },
  { to: '/attendance', label: 'Attendance', icon: FiCalendar, roles: ['super_admin', 'hr_officer', 'headteacher', 'teacher', 'payroll_officer'] },
  { to: '/leave', label: 'Leave', icon: FiClipboard, roles: ['super_admin', 'hr_officer', 'headteacher', 'teacher'] },
  { to: '/payroll', label: 'Payroll', icon: FiBarChart2, roles: ['super_admin', 'headteacher', 'payroll_officer', 'accountant', 'auditor'] },
  { to: '/anomalies', label: 'Anomalies', icon: FiAlertTriangle, roles: ['super_admin', 'headteacher', 'payroll_officer', 'accountant', 'auditor', 'hr_officer'] },
  { to: '/reports', label: 'Reports', icon: FiBarChart2, roles: ['super_admin', 'headteacher', 'payroll_officer', 'accountant', 'auditor'] },
  { to: '/audit', label: 'Audit trail', icon: FiShield, roles: ['super_admin', 'auditor', 'headteacher'] },
  { to: '/users', label: 'Users', icon: FiUsers, roles: ['super_admin'] },
]

function clockLabel() {
  return new Date().toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Layout() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(clockLabel())
  const [unread, setUnread] = useState(0)

  const visible = links.filter((link) => !link.roles || hasRole(...link.roles))

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const timer = setInterval(() => setNow(clockLabel()), 30000)
    api.get('/notifications').then(({ data }) => {
      setUnread((data || []).filter((item) => !item.is_read).length)
    }).catch(() => {})
    return () => clearInterval(timer)
  }, [])

  const nav = (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="bg-accent grid h-10 w-10 place-items-center rounded-full text-sm font-bold">SMS</div>
          <div>
            <p className="text-accent text-xs uppercase tracking-[0.18em]">School Management System</p>
            <h1 className="text-sm font-semibold leading-tight">Payroll & anomaly portal</h1>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visible.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-white/15 text-white' : 'text-slate-200 hover:bg-white/10'}`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4 text-sm">
        <p className="font-medium">{user?.name}</p>
        <p className="text-slate-300">{user?.role?.name}</p>
        <button
          className="text-accent mt-3 inline-flex items-center gap-2 hover:text-white"
          onClick={async () => {
            await logout()
            navigate('/login')
          }}
        >
          <FiLogOut /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-dvh bg-[#f4f1ea] text-slate-800">
      <aside className="bg-brand fixed inset-y-0 left-0 hidden w-64 flex-col lg:flex">
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-emerald-950/50" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="bg-brand relative z-50 flex h-full w-[min(18rem,86vw)] flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <button type="button" className="absolute right-3 top-3 min-h-11 min-w-11 text-white" onClick={() => setOpen(false)} aria-label="Close">
              <FiX size={20} />
            </button>
            {nav}
          </aside>
        </div>
      )}
      <main className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200 bg-[#f4f1ea]/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="min-h-11 min-w-11 rounded-lg p-2 text-emerald-950 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <FiMenu size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Ghana basic schools</p>
              <h2 className="truncate text-base font-semibold text-emerald-950 sm:text-lg">Operations dashboard</h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm sm:gap-3">
            <a
              href="/School-SMS-User-Manual.pdf"
              download="School-SMS-User-Manual.pdf"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-emerald-900 hover:bg-white sm:px-3"
              title="Download the user manual as a PDF"
              aria-label="Download user manual as PDF"
            >
              <FiDownload size={18} />
              <span className="hidden text-xs font-medium sm:inline">Manual</span>
            </a>
            <ThemeToggle />
            <span className="hidden rounded-full bg-white px-3 py-1 text-slate-500 ring-1 ring-stone-200 lg:inline">{now}</span>
            {unread > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">{unread} alerts</span>
            )}
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-950 md:inline">
              {user?.role?.name}
            </span>
          </div>
        </header>
        <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
