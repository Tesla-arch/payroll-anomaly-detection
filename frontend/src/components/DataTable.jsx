export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  empty = 'No records found.',
  onRowClick,
}) {
  const titleCol = columns.find((column) => column.primary) || columns[0]
  const detailCols = columns.filter((column) => column !== titleCol && !column.actions && !column.hideOnMobile)
  const actionCol = columns.find((column) => column.actions)

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article
            key={rowKey(row)}
            className={`rounded-2xl border border-stone-200 bg-white p-4 ${onRowClick ? 'cursor-pointer active:bg-stone-50' : ''}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-emerald-950 [overflow-wrap:anywhere]">{titleCol.cell(row)}</div>
              {titleCol.sub ? <p className="mt-1 text-xs text-slate-400">{titleCol.sub(row)}</p> : null}
            </div>
            {!!detailCols.length && (
              <dl className="mt-3 space-y-2 text-sm">
                {detailCols.map((column) => (
                  <div key={column.header} className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-xs uppercase tracking-wide text-slate-400">{column.header}</dt>
                    <dd className="min-w-0 text-right text-emerald-950 [overflow-wrap:anywhere]">{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actionCol ? (
              <div className="mt-3 flex flex-wrap justify-end gap-x-4 gap-y-2 text-sm" onClick={(event) => event.stopPropagation()}>
                {actionCol.cell(row)}
              </div>
            ) : null}
          </article>
        ))}
        {!rows.length && <p className="py-8 text-center text-sm text-slate-400">{empty}</p>}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="table min-w-[40rem]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.header || column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-emerald-50/60' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.header || column.key}
                    className={column.actions ? 'text-right' : undefined}
                    onClick={column.actions ? (event) => event.stopPropagation() : undefined}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-slate-400">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
