type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  loading?: boolean;
};

export default function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  emptyMessage = "No data available.",
  loading = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "32px", color: "var(--gray-400)" }}>
        Loading…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px", color: "var(--gray-400)", fontStyle: "italic" }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="hg-table-wrap">
      <table className="hg-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id ?? idx}>
              {columns.map((col) => (
                <td key={String(col.key)}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
