import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FiCheck, FiClock, FiSave, FiSearch, FiUserCheck } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/DataTable'

const statuses = [
  { id: 'present', label: 'Present' },
  { id: 'late', label: 'Late' },
  { id: 'absent', label: 'Absent' },
  { id: 'on_leave', label: 'On leave' },
]

function chipClass(status, active) {
  if (!active) return 'bg-stone-100 text-slate-600 hover:bg-stone-200'
  if (status === 'present') return 'tone-success-solid'
  if (status === 'late') return 'bg-amber-500 text-white'
  if (status === 'absent') return 'bg-red-700 text-white'
  return 'bg-sky-700 text-white'
}

function initials(name) {
  return String(name || 'ST').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5)
}

function clockLabel() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function AttendancePage() {
  const { user } = useAuth()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [roll, setRoll] = useState(null)
  const [draft, setDraft] = useState({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [tab, setTab] = useState('register')
  const [history, setHistory] = useState([])
  const [busy, setBusy] = useState(false)
  const [clock, setClock] = useState(clockLabel())

  useEffect(() => {
    const timer = setInterval(() => setClock(clockLabel()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadRoll = (nextDate = date) => {
    api.get('/attendance/roll', { params: { date: nextDate } }).then(({ data }) => {
      setRoll(data)
      const next = {}
      data.staff.forEach((member) => {
        next[member.staff_id] = {
          status: member.status || '',
          check_in_time: member.check_in_time || '',
          check_out_time: member.check_out_time || '',
        }
      })
      setDraft(next)
    }).catch(() => toast.error('Could not load the staff attendance register'))
  }

  useEffect(() => {
    loadRoll(date)
    api.get('/attendance', { params: { from: date, to: date } }).then(({ data }) => setHistory(data.data || data)).catch(() => {})
  }, [date])

  const setRow = (staffId, patch) => {
    setDraft((current) => {
      const row = { ...(current[staffId] || { status: '', check_in_time: '', check_out_time: '' }), ...patch }
      if (patch.status === 'present' && !row.check_in_time) row.check_in_time = '07:45'
      if (patch.status === 'late' && !row.check_in_time) row.check_in_time = nowTime()
      if (['absent', 'on_leave'].includes(row.status)) {
        row.check_in_time = ''
        row.check_out_time = ''
      }
      return { ...current, [staffId]: row }
    })
  }

  const staff = roll?.staff || []
  const summary = roll?.summary || {}
  const departments = useMemo(() => [...new Set(staff.map((item) => item.department).filter(Boolean))], [staff])

  const visible = staff.filter((member) => {
    const row = draft[member.staff_id] || {}
    const haystack = `${member.display_name} ${member.employee_id} ${member.department} ${member.job_title}`.toLowerCase()
    if (search && !haystack.includes(search.toLowerCase())) return false
    if (filter === 'unmarked') return !row.status
    if (filter.startsWith('dept:')) return member.department === filter.slice(5)
    if (filter !== 'all' && row.status !== filter) return false
    return true
  })

  const markAllPresent = () => {
    setDraft((current) => {
      const next = { ...current }
      staff.forEach((member) => {
        if (member.on_approved_leave) {
          next[member.staff_id] = { status: 'on_leave', check_in_time: '', check_out_time: '' }
          return
        }
        next[member.staff_id] = {
          status: 'present',
          check_in_time: current[member.staff_id]?.check_in_time || '07:45',
          check_out_time: current[member.staff_id]?.check_out_time || '14:30',
        }
      })
      return next
    })
  }

  const clockSelf = () => {
    if (!user?.staff_id) {
      toast.error('Your account is not linked to a staff record')
      return
    }
    setRow(user.staff_id, { status: 'present', check_in_time: nowTime() })
    toast.success('Your check-in time has been set. Save the register to confirm.')
  }

  const save = async () => {
    const records = staff
      .map((member) => ({ staff_id: member.staff_id, ...(draft[member.staff_id] || {}) }))
      .filter((row) => row.status)
      .map((row) => ({
        staff_id: row.staff_id,
        status: row.status,
        check_in_time: row.check_in_time || null,
        check_out_time: row.check_out_time || null,
      }))
    if (!records.length) {
      toast.error('Mark at least one staff member before saving')
      return
    }
    setBusy(true)
    try {
      const { data } = await api.post('/attendance/bulk', { date, records })
      setRoll(data)
      toast.success('Daily attendance saved')
      api.get('/attendance', { params: { from: date, to: date } }).then(({ data: historyData }) => setHistory(historyData.data || historyData))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save attendance')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Human resources</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Staff attendance</h3>
          <p className="mt-1 text-sm text-slate-500">Take the daily staff register with check-in time and duty status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl bg-white px-4 py-2 ring-1 ring-stone-200">
            <p className="text-xs uppercase tracking-wide text-slate-400">School clock</p>
            <p className="font-semibold tabular-nums text-emerald-950">{clock}</p>
          </div>
          {user?.staff_id && (
            <button type="button" className="bg-accent rounded-lg px-4 py-2 text-sm font-semibold" onClick={clockSelf}>
              <span className="inline-flex items-center gap-2"><FiClock /> Clock me in</span>
            </button>
          )}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['On roll', summary.roll ?? 0, 'text-emerald-950'],
          ['Present', summary.present ?? 0, 'text-success'],
          ['Late', summary.late ?? 0, 'text-amber-700'],
          ['Absent', summary.absent ?? 0, 'text-red-700'],
          ['On leave', summary.on_leave ?? 0, 'text-sky-800'],
        ].map(([label, value, cls]) => (
          <button key={label} type="button" className="card text-left" onClick={() => setFilter(label === 'On roll' ? 'all' : label === 'On leave' ? 'on_leave' : label.toLowerCase())}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`mt-2 text-3xl font-semibold ${cls}`}>{value}</p>
          </button>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          ['register', 'Daily register'],
          ['history', 'Saved records'],
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === id ? 'bg-emerald-800 text-white' : 'bg-white text-slate-600 ring-1 ring-stone-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'register' && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Date</label>
                <input type="date" className="input mt-1" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="relative w-full sm:w-64">
                <label className="text-xs uppercase tracking-wide text-slate-400">Search staff</label>
                <div className="relative mt-1">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-9" placeholder="Name, staff ID or unit" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">Filter</label>
                <select className="input mt-1" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">All staff</option>
                  <option value="unmarked">Unmarked</option>
                  {statuses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  {departments.map((item) => <option key={item} value={`dept:${item}`}>{item}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-lg bg-stone-100 px-3 py-2 text-sm" onClick={markAllPresent}>Mark duty staff present</button>
              <button type="button" className="btn-primary inline-flex items-center gap-2" disabled={busy} onClick={save}>
                <FiSave /> {busy ? 'Saving…' : 'Save register'}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400">{summary.unmarked ?? 0} still unmarked · approved leave is pre-filled.</p>

          <div className="space-y-2">
            {visible.map((member) => {
              const row = draft[member.staff_id] || {}
              const showTime = row.status === 'present' || row.status === 'late'
              return (
                <div key={member.staff_id} className={`rounded-2xl border px-3 py-3 sm:px-4 ${member.on_approved_leave ? 'border-sky-200 bg-sky-50/70' : 'border-stone-200 bg-white'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand text-accent grid h-11 w-11 place-items-center rounded-2xl text-sm font-semibold">
                        {initials(member.display_name)}
                      </div>
                      <div>
                        <p className="font-medium text-emerald-950">{member.display_name}</p>
                        <p className="text-xs text-slate-400">
                          {member.employee_id}
                          {member.job_title ? ` · ${member.job_title}` : ''}
                          {member.department ? ` · ${member.department}` : ''}
                        </p>
                        {member.on_approved_leave && (
                          <p className="mt-1 text-xs font-medium text-sky-800">Approved {member.leave_type || 'leave'} covering this date</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {statuses.map((status) => (
                        <button
                          key={status.id}
                          type="button"
                          onClick={() => setRow(member.staff_id, { status: status.id })}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ${chipClass(status.id, row.status === status.id)}`}
                        >
                          {row.status === status.id && <FiCheck className="mr-1 inline" />}
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {showTime && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="text-xs text-slate-500">Check-in</label>
                        <input type="time" className="input mt-1" value={row.check_in_time || ''} onChange={(event) => setRow(member.staff_id, { check_in_time: event.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Check-out</label>
                        <input type="time" className="input mt-1" value={row.check_out_time || ''} onChange={(event) => setRow(member.staff_id, { check_out_time: event.target.value })} />
                      </div>
                      <div className="flex items-end">
                        <button type="button" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" onClick={() => setRow(member.staff_id, { check_in_time: nowTime() })}>
                          Use current time
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {!visible.length && <p className="py-8 text-center text-sm text-slate-400">No staff match this filter.</p>}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <FiUserCheck className="text-emerald-700" />
            <h4 className="font-semibold text-emerald-950">Saved records for {date}</h4>
          </div>
          <DataTable
            rows={history}
            empty="No attendance saved for this date yet."
            columns={[
              {
                header: 'Staff',
                primary: true,
                cell: (row) => row.staff?.display_name || row.staff?.employee_id,
              },
              { header: 'Status', cell: (row) => <span className="capitalize">{String(row.status || '').replace('_', ' ')}</span> },
              { header: 'Check-in', cell: (row) => (row.check_in_time ? String(row.check_in_time).slice(0, 5) : '—') },
              { header: 'Check-out', cell: (row) => (row.check_out_time ? String(row.check_out_time).slice(0, 5) : '—') },
              { header: 'Hours', cell: (row) => row.hours_worked ?? '—' },
            ]}
          />
        </div>
      )}
    </div>
  )
}
