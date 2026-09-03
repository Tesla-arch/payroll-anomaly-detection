import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiExternalLink, FiMail, FiMessageCircle, FiPlus, FiSearch, FiSend } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/DataTable'

const tabs = [
  { id: 'directory', label: 'Directory' },
  { id: 'compose', label: 'Compose' },
  { id: 'sent', label: 'Sent' },
]

const roleDesk = {
  teacher: 'Write a meeting note or notice, pick the parents, and send it to the email and WhatsApp number on their accounts. Use Broadcast for the whole parent body.',
  headteacher: 'Register parents with a Ghana mobile, link wards, then send PTA meetings or a school-wide notice by email and WhatsApp.',
  hr_officer: 'Keep parent emails, WhatsApp numbers and wards up to date so teachers can reach the right household.',
  super_admin: 'Full parent register — link pupils, send meetings, or broadcast one message to every registered email and WhatsApp number.',
}

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: 'password',
  student_ids: [],
  status: 'active',
}

function wardName(student) {
  return student.display_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.admission_number
}

function prettyWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 16)
  return date.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function whatsappChatUrl(phone, text) {
  if (!phone) return null
  const digits = String(phone).replace(/\D+/g, '')
  if (!digits) return null
  const e164 = digits.startsWith('233') ? digits : digits.startsWith('0') ? `233${digits.slice(1)}` : digits
  const url = `https://wa.me/${e164}`
  return text ? `${url}?text=${encodeURIComponent(text)}` : url
}

function parentWhatsAppText(notice, parent) {
  const name = `${parent?.first_name || ''} ${parent?.last_name || ''}`.trim() || 'parent'
  const lines = [
    'School Management System',
    notice?.type === 'meeting' ? 'Parent meeting' : 'School notice',
    '',
    `Dear ${name},`,
  ]
  if (notice?.type === 'meeting') {
    if (notice.meeting_at) lines.push(`When: ${prettyWhen(notice.meeting_at)}`)
    lines.push(`Where: ${notice.meeting_venue || 'School compound'}`)
  }
  lines.push('', notice?.subject || '', notice?.body || '')
  return lines.filter((line) => line !== undefined).join('\n')
}

function whatsappStatusClass(status) {
  if (status === 'sent') return 'text-success'
  if (status === 'logged') return 'text-amber-700'
  return 'text-red-700'
}

function whatsappStatusLabel(status) {
  if (status === 'logged') return 'recorded — not delivered'
  return status
}

export default function ParentsPage() {
  const { role, hasRole } = useAuth()
  const canManage = hasRole('hr_officer', 'headteacher')
  const [params, setParams] = useSearchParams()
  const tab = tabs.some((item) => item.id === params.get('tab')) ? params.get('tab') : 'directory'

  const [parents, setParents] = useState([])
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState({})
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [compose, setCompose] = useState({
    type: 'notice',
    subject: '',
    body: '',
    meeting_at: '',
    meeting_venue: 'School compound',
    parent_ids: [],
    channels: ['email', 'whatsapp'],
  })
  const [sentId, setSentId] = useState(null)

  const setTab = (id) => {
    const next = new URLSearchParams(params)
    next.set('tab', id)
    setParams(next, { replace: true })
  }

  const load = () => {
    api.get('/parents', { params: { search } }).then(({ data }) => {
      setParents(data.parents || [])
      setStudents(data.students || [])
      setStats(data.stats || {})
      setSelectedId((current) => current || data.parents?.[0]?.id || null)
    }).catch(() => toast.error('Could not load the parent register'))
  }

  const loadMessages = () => {
    api.get('/parent-messages').then(({ data }) => {
      setMessages(data)
      setSentId((current) => current || data[0]?.id || null)
    }).catch(() => {})
  }

  useEffect(() => { load() }, [search])
  useEffect(() => { loadMessages() }, [])

  const selected = parents.find((row) => row.id === selectedId) || parents[0]
  const sent = messages.find((row) => row.id === sentId) || messages[0]
  const withEmail = parents.filter((row) => row.status === 'active' && row.email)
  const withPhone = parents.filter((row) => row.status === 'active' && row.phone)
  const selectedParents = parents.filter((row) => compose.parent_ids.includes(row.id))
  const wantsEmail = compose.channels.includes('email')
  const wantsWhatsapp = compose.channels.includes('whatsapp')
  const whatsappLive = Boolean(stats.whatsapp_live)
  const schoolWhatsapp = stats.whatsapp_from || '0591723646'

  const startCreate = () => {
    setEditing(true)
    setSelectedId(null)
    setForm(emptyForm)
  }

  const startEdit = (parent) => {
    setSelectedId(parent.id)
    setEditing(true)
    setForm({
      first_name: parent.first_name || '',
      last_name: parent.last_name || '',
      email: parent.email || '',
      phone: parent.phone || '',
      password: '',
      status: parent.status || 'active',
      student_ids: (parent.children || []).map((child) => child.id),
    })
  }

  const toggleWard = (id) => {
    setForm((current) => ({
      ...current,
      student_ids: current.student_ids.includes(id)
        ? current.student_ids.filter((item) => item !== id)
        : [...current.student_ids, id],
    }))
  }

  const toggleChannel = (channel) => {
    setCompose((current) => {
      const on = current.channels.includes(channel)
      const next = on ? current.channels.filter((item) => item !== channel) : [...current.channels, channel]
      return { ...current, channels: next.length ? next : current.channels }
    })
  }

  const toggleRecipient = (id) => {
    setCompose((current) => ({
      ...current,
      parent_ids: current.parent_ids.includes(id)
        ? current.parent_ids.filter((item) => item !== id)
        : [...current.parent_ids, id],
    }))
  }

  const saveParent = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (selectedId && editing) {
        await api.put(`/parents/${selectedId}`, payload)
        toast.success('Parent file updated')
      } else {
        const { data } = await api.post('/parents', payload)
        setSelectedId(data.id)
        toast.success(`Parent registered. Sign in on the Email tab with ${data.email} and the password you set.`)
      }
      setEditing(false)
      load()
    } catch (error) {
      toast.error(Object.values(error.response?.data?.errors || {})[0]?.[0] || error.response?.data?.message || 'Could not save parent')
    } finally {
      setBusy(false)
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const payload = {
        type: compose.type,
        subject: compose.subject,
        body: compose.body,
        meeting_at: compose.type === 'meeting' ? compose.meeting_at : undefined,
        meeting_venue: compose.type === 'meeting' ? compose.meeting_venue : undefined,
        parent_ids: compose.type === 'broadcast' ? undefined : compose.parent_ids,
        channels: compose.channels,
      }
      const { data } = await api.post('/parent-messages', payload)
      toast.success(`${data.sent_count} household${data.sent_count === 1 ? '' : 's'} reached${data.failed_count ? ` · ${data.failed_count} failed` : ''}`)
      if (compose.channels.includes('whatsapp') && !stats.whatsapp_live) {
        toast('WhatsApp is not connected. Open each parent from Sent to deliver from the school phone.', { duration: 7000 })
      }
      setCompose((current) => ({ ...current, subject: '', body: '', parent_ids: [] }))
      load()
      loadMessages()
      setSentId(data.id)
      setTab('sent')
    } catch (error) {
      toast.error(Object.values(error.response?.data?.errors || {})[0]?.[0] || error.response?.data?.message || 'Could not send the message')
    } finally {
      setBusy(false)
    }
  }

  const recipientPreview = useMemo(() => {
    if (compose.type === 'broadcast') {
      const count = wantsWhatsapp && wantsEmail
        ? Math.max(withEmail.length, withPhone.length)
        : wantsWhatsapp ? withPhone.length : withEmail.length
      return `${count} household${count === 1 ? '' : 's'} on the register`
    }
    return `${selectedParents.length} selected`
  }, [compose.type, wantsEmail, wantsWhatsapp, withEmail.length, withPhone.length, selectedParents.length])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Home–school contact</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Parents</h3>
          <p className="mt-1 text-sm text-slate-500">
            Link each household to its wards, keep the registered email and WhatsApp number current, then send meetings and notices from the school.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && tab === 'directory' && (
            <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={startCreate}>
              <FiPlus /> Register parent
            </button>
          )}
          {tab !== 'compose' && (
            <button type="button" className={`${canManage && tab === 'directory' ? 'rounded-lg border border-stone-300 px-4 py-2 text-sm' : 'btn-primary'} inline-flex items-center gap-2`} onClick={() => setTab('compose')}>
              <FiMail /> Compose message
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950 ring-1 ring-emerald-100">
        {roleDesk[role] || roleDesk.teacher}
      </div>

      {!whatsappLive && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100">
          WhatsApp is not connected to {schoolWhatsapp}, so parent phones will not receive notices automatically.
          After you compose, open each household from the Sent tab — WhatsApp on this device should be signed in as {schoolWhatsapp}.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Parents</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{stats.parents ?? parents.length}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Reachable by email</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{stats.with_email ?? withEmail.length}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Reachable on WhatsApp</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{stats.with_phone ?? withPhone.length}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">School WhatsApp</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{schoolWhatsapp}</p>
          <p className="mt-1 text-xs text-slate-400">{whatsappLive ? 'Live — notices send from this account' : 'Not connected — open parents in WhatsApp from Sent'}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Pupils without a parent account</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{stats.unlinked_students ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Messages sent</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{stats.messages ?? messages.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ${tab === item.id ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'directory' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="card xl:col-span-2">
            <div className="relative mb-4 max-w-sm">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Search parent, email, phone or ward" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <DataTable
              rows={parents}
              empty="No parent accounts yet."
              onRowClick={(row) => { setSelectedId(row.id); setEditing(false) }}
              columns={[
                {
                  header: 'Parent',
                  primary: true,
                  cell: (row) => `${row.first_name} ${row.last_name}`,
                  sub: (row) => row.phone || 'No phone',
                },
                { header: 'Email', cell: (row) => <span className="break-all text-emerald-800">{row.email || '—'}</span> },
                {
                  header: 'Wards',
                  cell: (row) => (row.children || []).length
                    ? (row.children || []).map((child) => wardName(child)).join(', ')
                    : <span className="text-slate-400">No ward linked</span>,
                },
                { header: 'Status', cell: (row) => <span className="capitalize">{row.status}</span> },
              ]}
            />
          </div>

          <aside className="card space-y-3">
            {editing ? (
              <form className="space-y-3" onSubmit={saveParent}>
                <p className="text-xs uppercase tracking-wide text-slate-400">{selectedId ? 'Edit parent' : 'New parent'}</p>
                <input className="input" placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                <input className="input" placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                <input className="input" type="email" autoComplete="off" placeholder="Registered email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <div>
                  <input className="input" placeholder="WhatsApp number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <p className="mt-1 text-xs text-slate-400">Ghana mobile used for WhatsApp notices, e.g. 0241234567.</p>
                </div>
                <div>
                  <input
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    placeholder={selectedId ? 'New password (optional)' : 'Portal password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!selectedId}
                    minLength={selectedId && !form.password ? undefined : 8}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {selectedId
                      ? 'Leave blank to keep the current password.'
                      : 'They sign in on the Email tab with this address. The default password is password.'}
                  </p>
                </div>
                {selectedId && (
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                )}
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Wards</p>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-stone-50 p-2">
                    {students.map((student) => {
                      const taken = student.parent_id && student.parent_id !== selectedId && !form.student_ids.includes(student.id)
                      return (
                        <label key={student.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${taken ? 'text-slate-400' : ''}`}>
                          <input
                            type="checkbox"
                            checked={form.student_ids.includes(student.id)}
                            disabled={taken}
                            onChange={() => toggleWard(student.id)}
                          />
                          <span>
                            {wardName(student)}
                            <span className="ml-1 text-xs text-slate-400">{student.admission_number}{student.school_class ? ` · ${student.school_class.name}` : ''}</span>
                          </span>
                        </label>
                      )
                    })}
                    {!students.length && <p className="px-2 py-3 text-sm text-slate-400">No pupils on the roll.</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Save parent'}</button>
                  <button type="button" className="rounded-lg border border-stone-300 px-4 py-2 text-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : selected ? (
              <>
                <p className="text-xs uppercase tracking-wide text-slate-400">Selected household</p>
                <h4 className="font-semibold text-emerald-950">{selected.first_name} {selected.last_name}</h4>
                <p className="text-sm text-emerald-800">{selected.email}</p>
                <p className="text-sm text-slate-500">{selected.phone || 'No phone on file'}</p>
                <ul className="space-y-1 text-sm">
                  {(selected.children || []).map((child) => (
                    <li key={child.id} className="rounded-xl bg-stone-50 px-3 py-2">
                      {wardName(child)}
                      <span className="block text-xs text-slate-400">{child.admission_number}{child.school_class ? ` · ${child.school_class.name}` : ''}</span>
                    </li>
                  ))}
                  {!(selected.children || []).length && <li className="text-slate-400">No ward linked yet.</li>}
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  {canManage && (
                    <button type="button" className="btn-primary" onClick={() => startEdit(selected)}>Edit / link wards</button>
                  )}
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
                    onClick={() => {
                      setCompose((current) => ({ ...current, type: 'notice', parent_ids: [selected.id] }))
                      setTab('compose')
                    }}
                  >
                    Message this parent
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">Select a parent, or register a household.</p>
            )}
          </aside>
        </div>
      )}

      {tab === 'compose' && (
        <form className="grid gap-6 xl:grid-cols-3" onSubmit={sendMessage}>
          <div className="card space-y-4 xl:col-span-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Message type</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { id: 'notice', label: 'Notice' },
                  { id: 'meeting', label: 'Meeting' },
                  { id: 'broadcast', label: 'Broadcast to all' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCompose((current) => ({ ...current, type: item.id }))}
                    className={`rounded-full px-4 py-1.5 text-sm ${compose.type === item.id ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <input className="input" placeholder="Subject" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} required />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Send by</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { id: 'email', label: 'Email', icon: FiMail },
                  { id: 'whatsapp', label: 'WhatsApp', icon: FiMessageCircle },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleChannel(item.id)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ${compose.channels.includes(item.id) ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-slate-600 hover:bg-stone-200'}`}
                    >
                      <Icon /> {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
            {compose.type === 'meeting' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-600">
                  Date and time
                  <input className="input mt-1" type="datetime-local" value={compose.meeting_at} onChange={(e) => setCompose({ ...compose, meeting_at: e.target.value })} required />
                </label>
                <label className="text-sm text-slate-600">
                  Venue
                  <input className="input mt-1" value={compose.meeting_venue} onChange={(e) => setCompose({ ...compose, meeting_venue: e.target.value })} placeholder="School compound" />
                </label>
              </div>
            )}
            <textarea
              className="input min-h-40"
              placeholder="Write the message parents will receive by email and WhatsApp."
              value={compose.body}
              onChange={(e) => setCompose({ ...compose, body: e.target.value })}
              required
            />
            <p className="text-xs text-slate-400">
              Email goes to the address on file. WhatsApp is meant to leave from {schoolWhatsapp} to each parent’s Ghana mobile.
              {whatsappLive
                ? ' Live delivery is on.'
                : ' Automatic delivery is off — use Open WhatsApp on the Sent tab until the school phone is linked.'}
            </p>
            <button className="btn-primary inline-flex items-center gap-2" disabled={busy}>
              <FiSend /> {busy ? 'Sending…' : `Send to ${recipientPreview}`}
            </button>
          </div>
          <aside className="card space-y-3">
            <h4 className="font-semibold text-emerald-950">{compose.type === 'broadcast' ? 'Everyone on the register' : 'Recipients'}</h4>
            {compose.type === 'broadcast' ? (
              <p className="text-sm text-slate-500">
                This notice goes to every active parent
                {wantsEmail && wantsWhatsapp ? ' by email and WhatsApp' : wantsWhatsapp ? ' on WhatsApp' : ' by email'}
                {' '}— currently {withEmail.length} email{withEmail.length === 1 ? '' : 's'} and {withPhone.length} WhatsApp number{withPhone.length === 1 ? '' : 's'}.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded-lg border border-stone-300 px-3 py-1 text-xs" onClick={() => setCompose((current) => ({ ...current, parent_ids: withEmail.map((row) => row.id) }))}>
                    Select all with email
                  </button>
                  <button type="button" className="rounded-lg border border-stone-300 px-3 py-1 text-xs" onClick={() => setCompose((current) => ({ ...current, parent_ids: withPhone.map((row) => row.id) }))}>
                    Select all with WhatsApp
                  </button>
                  <button type="button" className="rounded-lg border border-stone-300 px-3 py-1 text-xs" onClick={() => setCompose((current) => ({ ...current, parent_ids: [] }))}>
                    Clear
                  </button>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {parents.map((row) => (
                    <label key={row.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50">
                      <input type="checkbox" className="mt-1" checked={compose.parent_ids.includes(row.id)} onChange={() => toggleRecipient(row.id)} />
                      <span>
                        <span className="font-medium">{row.first_name} {row.last_name}</span>
                        <span className="block text-xs text-slate-400">
                          {row.email || 'No email'}
                          {row.phone ? ` · ${row.phone}` : ' · No WhatsApp'}
                          {(row.children || []).length ? ` · ${(row.children || []).map(wardName).join(', ')}` : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </aside>
        </form>
      )}

      {tab === 'sent' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="card min-w-0 xl:col-span-2">
            <DataTable
              rows={messages}
              empty="No parent messages yet."
              onRowClick={(row) => setSentId(row.id)}
              columns={[
                {
                  header: 'Subject',
                  primary: true,
                  cell: (row) => row.subject,
                  sub: (row) => prettyWhen(row.created_at),
                },
                { header: 'Type', cell: (row) => <span className="capitalize">{row.is_broadcast ? 'Broadcast' : row.type}</span> },
                { header: 'Sent', cell: (row) => `${row.sent_count}${row.failed_count ? ` · ${row.failed_count} failed` : ''}` },
                { header: 'By', cell: (row) => `${row.sender?.first_name || ''} ${row.sender?.last_name || ''}`.trim() || '—' },
              ]}
            />
          </div>
          <aside className="card space-y-3">
            {sent ? (
              <>
                <p className="text-xs uppercase tracking-wide text-slate-400">Delivery</p>
                <h4 className="font-semibold text-emerald-950">{sent.subject}</h4>
                {sent.type === 'meeting' && (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                    {prettyWhen(sent.meeting_at)} · {sent.meeting_venue || 'School compound'}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm text-slate-600">{sent.body}</p>
                <ul className="space-y-1 text-sm">
                  {(sent.recipients || []).map((row) => {
                    const chatUrl = whatsappChatUrl(row.phone, parentWhatsAppText(sent, row.parent))
                    const showOpen = Boolean(chatUrl) && (!whatsappLive || row.whatsapp_status === 'logged' || row.whatsapp_status === 'failed')
                    return (
                      <li key={row.id} className="space-y-1 rounded-lg bg-stone-50 px-3 py-2">
                        <div className="flex justify-between gap-2">
                          <span>
                            {row.parent?.first_name} {row.parent?.last_name}
                            <span className="block text-xs text-slate-400">{row.email || 'No email'}</span>
                            <span className="block text-xs text-slate-400">{row.phone || 'No WhatsApp'}</span>
                          </span>
                          <span className="text-right text-xs">
                            {row.email_status && row.email_status !== 'skipped' && (
                              <span className={`block ${row.email_status === 'sent' ? 'text-success' : 'text-red-700'}`}>Email {row.email_status}</span>
                            )}
                            {row.whatsapp_status && row.whatsapp_status !== 'skipped' && (
                              <span className={`block ${whatsappStatusClass(row.whatsapp_status)}`}>WhatsApp {whatsappStatusLabel(row.whatsapp_status)}</span>
                            )}
                            {(!row.email_status || row.email_status === 'skipped') && (!row.whatsapp_status || row.whatsapp_status === 'skipped') && (
                              <span className={row.status === 'sent' ? 'text-success' : 'text-red-700'}>{row.status}</span>
                            )}
                            {row.whatsapp_error && <span className="mt-1 block text-red-700">{row.whatsapp_error}</span>}
                          </span>
                        </div>
                        {showOpen && (
                          <a
                            href={chatUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:underline"
                          >
                            <FiExternalLink /> Open WhatsApp
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm text-slate-400">Sent notices will appear here.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
