import { useEffect, useState } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'

export default function AuditPage() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    api.get('/audit-logs').then(({ data }) => setRows(data.data || data))
  }, [])

  return (
    <div className="card min-w-0">
      <h3 className="mb-4 text-lg font-semibold">Audit trail</h3>
      <DataTable
        rows={rows}
        empty="No audit events yet."
        columns={[
          {
            header: 'When',
            primary: true,
            cell: (row) => row.created_at?.replace('T', ' ').slice(0, 19),
            sub: (row) => row.action,
          },
          { header: 'User', cell: (row) => (row.user ? `${row.user.first_name} ${row.user.last_name}` : 'System') },
          { header: 'Action', cell: (row) => row.action },
          { header: 'IP', cell: (row) => row.ip_address },
        ]}
      />
    </div>
  )
}
