import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiMail, FiPlus, FiSearch, FiSend } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/DataTable'

const tabs = [
  { id: 'directory', label: 'Directory' },
  { id: 'compose', label: 'Compose' },
  { id: 'sent', label: 'Sent' },
]

const roleDesk = {
  teacher: 'Write a meeting note or notice, pick the parents, and send it to the emails on their accounts. Use Broadcast for the whole parent body.',
  headteacher: 'Register parents, link wards, then send PTA meetings or a school-wide notice from this desk.',
  hr_officer: 'Keep parent emails and wards up to date so teachers can reach the right household.',
  super_admin: 'Full parent register — link pupils, send meetings, or broadcast one message to every registered email.',
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
  const selectedParents = parents.filter((row) => compose.parent_ids.includes(row.id))

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
      }
      const { data } = await api.post('/parent-messages', payload)
      toast.success(`${data.sent_count} email${data.sent_count === 1 ? '' : 's'} sent${data.failed_count ? ` · ${data.failed_count} failed` : ''}`)
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
    if (compose.type === 'broadcast') return `${withEmail.length} parent email${withEmail.length === 1 ? '' : 's'} on the register`
    return `${selectedParents.length} selected`
  }, [compose.type, withEmail.length, selectedParents.length])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Home–school contact</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Parents</h3>
          <p className="mt-1 text-sm text-slate-500">
            Link each household to its wards, keep the registered email current, then send meetings and notices from the school.
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Parents</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{stats.parents ?? parents.length}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Reachable by email</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{stats.with_email ?? withEmail.length}</p>
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
              <input className="input pl-9" placeholder="Search parent, email or ward" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
              placeholder="Write the message parents will receive in their registered inbox."
              value={compose.body}
              onChange={(e) => setCompose({ ...compose, body: e.target.value })}
              required
            />
            <p className="text-xs text-slate-400">
              Mail is sent to the address on each parent account. With the demo mailer it is written to the API log; connect SMTP in production.
            </p>
            <button className="btn-primary inline-flex items-center gap-2" disabled={busy}>
              <FiSend /> {busy ? 'Sending…' : `Send to ${recipientPreview}`}
            </button>
          </div>
          <aside className="card space-y-3">
            <h4 className="font-semibold text-emerald-950">{compose.type === 'broadcast' ? 'Everyone on the register' : 'Recipients'}</h4>
            {compose.type === 'broadcast' ? (
              <p className="text-sm text-slate-500">
                This notice goes to every active parent account with an email — currently {withEmail.length} household{withEmail.length === 1 ? '' : 's'}.
              </p>
            ) : (
              <>
                <div className="flex gap-2">
                  <button type="button" className="rounded-lg border border-stone-300 px-3 py-1 text-xs" onClick={() => setCompose((current) => ({ ...current, parent_ids: withEmail.map((row) => row.id) }))}>
                    Select all with email
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
                        <span className="block text-xs text-slate-400">{row.email || 'No email'}{(row.children || []).length ? ` · ${(row.children || []).map(wardName).join(', ')}` : ''}</span>
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
                  {(sent.recipients || []).map((row) => (
                    <li key={row.id} className="flex justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2">
                      <span>{row.parent?.first_name} {row.parent?.last_name}<span className="block text-xs text-slate-400">{row.email}</span></span>
                      <span className={row.status === 'sent' ? 'text-emerald-700' : 'text-red-700'}>{row.status}</span>
                    </li>
                  ))}
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
