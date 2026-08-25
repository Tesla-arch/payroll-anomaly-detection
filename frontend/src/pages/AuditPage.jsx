import { useEffect, useState } from 'react'
import api from '../api/client'

export default function AuditPage() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    api.get('/audit-logs').then(({ data }) => setRows(data.data || data))
  }, [])

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold">Audit trail</h3>
      <table className="table">
        <thead><tr><th>When</th><th>User</th><th>Action</th><th>IP</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.created_at?.replace('T', ' ').slice(0, 19)}</td>
              <td>{row.user ? `${row.user.first_name} ${row.user.last_name}` : 'System'}</td>
              <td>{row.action}</td>
              <td>{row.ip_address}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
