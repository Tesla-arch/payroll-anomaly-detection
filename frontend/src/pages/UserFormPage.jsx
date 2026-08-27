import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { portalRoles, roleHint } from '../data/portalRoles'

const empty = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: 'password',
  role_id: '',
  status: 'active',
}

function Field({ label, children, wide, hint }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export default function UserFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const [form, setForm] = useState(empty)
  const [roles, setRoles] = useState([])
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loaded, setLoaded] = useState(!editing)

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    api.get('/roles').then(({ data }) => setRoles(data)).catch(() => toast.error('Could not load desks'))
  }, [])

  useEffect(() => {
    if (!editing) return undefined
    api.get(`/users/${id}`).then(({ data }) => {
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        password: '',
        role_id: data.role?.id ? String(data.role.id) : '',
        status: data.status || 'active',
      })
      setLoaded(true)
    }).catch(() => {
      toast.error('Could not open this account')
      navigate('/users', { replace: true })
    })
    return undefined
  }, [id, editing, navigate])

  const selectedRole = roles.find((role) => String(role.id) === String(form.role_id))

  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const payload = { ...form, role_id: Number(form.role_id) }
      if (editing && !payload.password) delete payload.password
      if (editing) await api.put(`/users/${id}`, payload)
      else await api.post('/users', payload)
      toast.success(editing ? 'Account updated' : 'User created')
      navigate('/users')
    } catch (error) {
      const first = error.response?.data?.errors ? Object.values(error.response.data.errors)[0]?.[0] : null
      toast.error(first || error.response?.data?.message || (editing ? 'Could not update the account' : 'Could not create user'))
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) {
    return <p className="text-slate-500">Loading account…</p>
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/users" className="inline-flex items-center gap-2 text-sm text-emerald-800">
          <FiArrowLeft /> Portal users
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Accounts</p>
        <h3 className="mt-1 text-2xl font-semibold text-emerald-950">{editing ? 'Edit user' : 'Create user'}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {editing ? 'Change the name, desk or password for this portal login.' : 'Open a school portal login and assign the desk they will work from.'}
        </p>
      </div>

      <form onSubmit={save} className="grid items-start gap-6 xl:grid-cols-3">
        <div className="card space-y-4 xl:col-span-2">
          <header>
            <h4 className="text-lg font-semibold text-emerald-950">Account details</h4>
            <p className="text-sm text-slate-500">Name and email as they will appear on the audit trail.</p>
          </header>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <input className="input" value={form.first_name} onChange={(event) => set('first_name', event.target.value)} placeholder="Ama" required />
            </Field>
            <Field label="Surname">
              <input className="input" value={form.last_name} onChange={(event) => set('last_name', event.target.value)} placeholder="Mensah" required />
            </Field>
            <Field label="School email" hint="Used to sign in.">
              <input className="input" type="email" value={form.email} onChange={(event) => set('email', event.target.value)} placeholder="name@school.gh" required />
            </Field>
            <Field label="Phone">
              <input className="input" value={form.phone} onChange={(event) => set('phone', event.target.value)} placeholder="0240000000" />
            </Field>
            <Field label={editing ? 'New password' : 'Password'} hint={editing ? 'Leave blank to keep the current password.' : 'Demo accounts use password. Use at least 8 characters.'} wide>
              <div className="relative">
                <input
                  className="input pr-11"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => set('password', event.target.value)}
                  required={!editing}
                  minLength={editing && !form.password ? undefined : 8}
                  autoComplete="new-password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </Field>
            <Field label="Status">
              <div className="grid grid-cols-2 gap-2">
                {[['active', 'Active'], ['inactive', 'Inactive']].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={editing && me?.id === Number(id) && value === 'inactive'}
                    onClick={() => set('status', value)}
                    className={`rounded-xl border px-3 py-2 text-sm ${form.status === value ? 'border-emerald-700 bg-emerald-50 font-medium text-emerald-950' : 'border-stone-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card space-y-3">
            <header>
              <h4 className="font-semibold text-emerald-950">Desk</h4>
              <p className="text-sm text-slate-500">This decides which menus they see.</p>
            </header>
            <div className="space-y-2">
              {portalRoles.map((item) => {
                const match = roles.find((role) => role.slug === item.slug)
                if (!match) return null
                const active = String(form.role_id) === String(match.id)
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => set('role_id', String(match.id))}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200 hover:border-emerald-300'}`}
                  >
                    <p className="text-sm font-medium text-emerald-950">{item.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.hint}</p>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="card space-y-3">
            <p className="text-sm text-slate-600">
              {selectedRole ? roleHint(selectedRole.slug) : 'Pick a desk before you save.'}
            </p>
            <button className="btn-primary w-full" disabled={busy || !form.role_id}>
              {busy ? 'Saving…' : editing ? 'Save account' : 'Create user'}
            </button>
            <Link to="/users" className="block text-center text-sm text-emerald-800">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
