import { memo } from "react";

function PreviewTable({ headers, rows }) {
  if (!rows.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">CSV Preview</h2>
          <p className="mt-1 text-sm text-slate-600">
            Showing {rows.length} raw uploaded {rows.length === 1 ? "row" : "rows"}.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {headers.length} columns
        </span>
      </div>

      <div className="max-h-[520px] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="sticky left-0 z-20 border-b border-slate-200 bg-slate-100 px-4 py-3 font-semibold">
                Row
              </th>
              {headers.map((header) => (
                <th
                  className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold"
                  key={header}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, rowIndex) => (
              <tr className="hover:bg-slate-50" key={row.__previewId}>
                <td className="sticky left-0 border-b border-slate-100 bg-white px-4 py-3 font-medium text-slate-500">
                  {rowIndex + 1}
                </td>
                {headers.map((header) => (
                  <td
                    className="max-w-[280px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700"
                    key={`${row.__previewId}-${header}`}
                    title={row[header] || ""}
                  >
                    <span className="block overflow-hidden text-ellipsis">
                      {row[header] || ""}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default memo(PreviewTable);
