import type { ReactNode } from 'react';

interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyFor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, rows, keyFor, onRowClick, emptyMessage = 'Sin resultados.' }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col.header} className="text-left font-medium text-muted-foreground py-2 pr-4">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyFor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-border/50 ${onRowClick ? 'cursor-pointer hover:bg-secondary/30' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.header} className="py-3 pr-4">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
