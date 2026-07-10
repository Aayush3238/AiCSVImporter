const RESULT_COLUMNS = [
  "name",
  "email",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "crm_note"
];

export default function ImportResults({ result }) {
  if (!result) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-950">Import Result</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Total rows" value={result.total} />
          <Stat label="Imported" value={result.imported} />
          <Stat label="Skipped" value={result.skipped} />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Processed {result.batches?.length || 0} backend{" "}
          {(result.batches?.length || 0) === 1 ? "batch" : "batches"} of up to{" "}
          {result.batchSize || 10} rows each.
        </p>
      </div>

      {result.records?.length ? (
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold">
                  Row
                </th>
                {RESULT_COLUMNS.map((column) => (
                  <th
                    className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold"
                    key={column}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {result.records.map((record) => (
                <tr className="hover:bg-slate-50" key={record.rowIndex}>
                  <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 font-medium text-slate-500">
                    {record.rowIndex + 1}
                  </td>
                  {RESULT_COLUMNS.map((column) => (
                    <td
                      className="max-w-[280px] whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700"
                      key={`${record.rowIndex}-${column}`}
                      title={record.data[column] || ""}
                    >
                      <span className="block overflow-hidden text-ellipsis">
                        {record.data[column] || ""}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-5 text-sm text-slate-600">
          No rows were imported. Check skipped records and CSV contact fields.
        </p>
      )}

      {result.skippedRecords?.length ? (
        <div className="border-t border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-950">
            Skipped records
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {result.skippedRecords.map((record) => (
              <li key={record.rowIndex}>
                Row {record.rowIndex + 1}: {record.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
