import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import DataTable from '../components/DataTable'

export default function UsersPage() {
  const [rows, setRows] = useState([])
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: 'password', role_id: '' })

  const load = () => {
    api.get('/users').then(({ data }) => setRows(data.data || data))
    api.get('/roles').then(({ data }) => setRoles(data))
  }
  useEffect(() => { load() }, [])

  const save = async (event) => {
    event.preventDefault()
    try {
      await api.post('/users', form)
      toast.success('User created')
      load()
    } catch {
      toast.error('Could not create user')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="card min-w-0 xl:col-span-2">
        <h3 className="mb-4 text-lg font-semibold">Users</h3>
        <DataTable
          rows={rows}
          empty="No users yet."
          columns={[
            {
              header: 'Name',
              primary: true,
              cell: (row) => `${row.first_name} ${row.last_name}`,
              sub: (row) => row.email,
            },
            { header: 'Email', hideOnMobile: true, cell: (row) => <span className="break-all">{row.email}</span> },
            { header: 'Role', cell: (row) => row.role?.name },
            { header: 'Status', cell: (row) => <span className="capitalize">{row.status}</span> },
          ]}
        />
      </div>
      <form className="card space-y-3" onSubmit={save}>
        <h3 className="font-semibold">Create user</h3>
        <input className="input" placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
        <input className="input" placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="input" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select className="input" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} required>
          <option value="">Role</option>
          {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
        </select>
        <button className="btn-primary w-full">Create</button>
      </form>
    </div>
  )
}
