import { Card } from './Card.jsx';

/**
 * §4.4: admin tables collapse into stacked cards under 768px - never a
 * horizontally scrolling table. One `columns` definition drives both the
 * real <table> (desktop) and the stacked-card list (mobile) so they can
 * never drift apart.
 */
export function ResponsiveTable({ columns, rows, keyField = 'id' }) {
  return (
    <>
      <div className="hidden md:block overflow-hidden rounded-2xl border border-gs-teal-100">
        <table className="w-full text-sm">
          <thead className="bg-gs-teal-100/50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="text-left font-semibold text-gs-ink px-4 py-3">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[keyField]} className="border-t border-gs-teal-100">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gs-ink align-middle">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <Card key={row[keyField]} className="space-y-2">
            {columns.map((col) =>
              col.label ? (
                <div key={col.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gs-muted shrink-0">{col.label}</span>
                  <span className="text-gs-ink font-medium text-right">{col.render ? col.render(row) : row[col.key]}</span>
                </div>
              ) : (
                <div key={col.key} className="pt-1">
                  {col.render ? col.render(row) : row[col.key]}
                </div>
              )
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
