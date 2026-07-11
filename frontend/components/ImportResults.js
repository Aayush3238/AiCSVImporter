"use client";

import { memo, useMemo } from "react";
import Papa from "papaparse";
import { CRM_FIELDS as CRM_COLUMNS } from "../lib/constants.js";
import * as XLSX from "xlsx";

function downloadImportedCsv(records) {
  const data = records.map((record) => {
    const row = {};
    CRM_COLUMNS.forEach((column) => {
      row[column] = record.data?.[column] || "";
    });
    return row;
  });

  const csv = Papa.unparse(data, { columns: CRM_COLUMNS });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "groweasy-normalized-leads.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadImportedXlsx(records) {
  const data = records.map((record) => {
    const row = {};
    CRM_COLUMNS.forEach((column) => {
      row[column] = record.data?.[column] || "";
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data, { header: CRM_COLUMNS });

  const colWidths = CRM_COLUMNS.map((column) => {
    let maxLength = column.length;
    data.forEach((row) => {
      const cellLength = String(row[column] || "").length;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    return { wch: maxLength + 2 };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
  XLSX.writeFile(workbook, "groweasy-normalized-leads.xlsx");
}

function ImportResults({ result }) {
  const failedBatches = useMemo(
    () => result?.batches?.filter((batch) => batch.status === "failed") || [],
    [result?.batches]
  );

  if (!result) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Import Result
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Normalized records use the exact GrowEasy CRM field order.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className="inline-flex items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!result.records?.length}
              onClick={() => downloadImportedCsv(result.records)}
              type="button"
            >
              Download CSV
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!result.records?.length}
              onClick={() => downloadImportedXlsx(result.records)}
              type="button"
            >
              Download Excel
            </button>
          </div>
        </div>

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
        {result.batches?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {result.batches.map((batch) => (
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  batch.status === "processed"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-red-50 text-red-800"
                }`}
                key={batch.batchNumber}
                title={batch.reason || ""}
              >
                Batch {batch.batchNumber}: {batch.status}
              </span>
            ))}
          </div>
        ) : null}
        {failedBatches.length ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {failedBatches.length} AI{" "}
            {failedBatches.length === 1 ? "batch failed" : "batches failed"}.
            Successful batches were kept, and failed batch rows were added to
            skipped records.
          </div>
        ) : null}
      </div>

      {result.records?.length ? (
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold">
                  Row
                </th>
                {CRM_COLUMNS.map((column) => (
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
                  {CRM_COLUMNS.map((column) => (
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
          <div className="mt-3 max-h-64 overflow-auto rounded-md border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Row
                  </th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {result.skippedRecords.map((record) => (
                  <tr key={record.rowIndex}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-500">
                      {record.rowIndex + 1}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {record.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

export default memo(ImportResults);
