"use client";

import Papa from "papaparse";
import { useState } from "react";
import FileUpload from "../components/FileUpload";
import ImportResults from "../components/ImportResults";
import PreviewTable from "../components/PreviewTable";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

function validateCsvFile(file) {
  const hasCsvName = file.name.toLowerCase().endsWith(".csv");
  const hasCsvType =
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "";

  if (!hasCsvName || !hasCsvType) {
    return "Please upload a valid .csv file.";
  }

  if (file.size === 0) {
    return "The selected CSV file is empty.";
  }

  return "";
}

function getHeadersFromRows(rows) {
  const headers = new Set();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key && key !== "__previewId") {
        headers.add(key);
      }
    });
  });

  return Array.from(headers);
}

export default function HomePage() {
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  function resetPreview() {
    setHeaders([]);
    setRows([]);
    setNotice("");
    setImportResult(null);
  }

  function handleFileSelect(file) {
    setError("");
    resetPreview();
    setFileName(file.name);
    setSelectedFile(null);

    const validationError = validateCsvFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsParsing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        setIsParsing(false);

        if (result.errors.length) {
          const firstError = result.errors[0];
          setError(
            `CSV parsing error on row ${firstError.row ?? "unknown"}: ${firstError.message}`
          );
          return;
        }

        const parsedRows = result.data.filter((row) =>
          Object.values(row).some((value) => String(value || "").trim() !== "")
        );

        if (!parsedRows.length) {
          setError("The CSV has headers but no data rows to preview.");
          return;
        }

        const previewRows = parsedRows.map((row, index) => ({
          ...row,
          __previewId: `${file.name}-${index}`
        }));
        const parsedHeaders = result.meta.fields?.length
          ? result.meta.fields.filter(Boolean)
          : getHeadersFromRows(previewRows);

        if (!parsedHeaders.length) {
          setError("The CSV does not contain usable column headers.");
          return;
        }

        setHeaders(parsedHeaders);
        setRows(previewRows);
        setSelectedFile(file);
        setNotice(
          "Preview loaded locally. The backend and AI have not been called yet."
        );
      },
      error: (parseError) => {
        setIsParsing(false);
        setError(parseError.message || "Unable to parse the CSV file.");
      }
    });
  }

  async function handleConfirmImport() {
    if (!selectedFile) {
      setError("Please upload and preview a valid CSV before importing.");
      return;
    }

    setError("");
    setNotice(
      `Uploading CSV to backend. Processing batch 1 of ${Math.ceil(rows.length / 10)} with AI...`
    );
    setImportResult(null);
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${BACKEND_URL}/api/import`, {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Import failed.");
      }

      setImportResult(payload);
      setNotice(
        `Backend import complete. Processed ${payload.batches.length} batch${
          payload.batches.length === 1 ? "" : "es"
        }.`
      );
    } catch (importError) {
      setError(importError.message || "Unable to import CSV.");
      setNotice("");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          GrowEasy
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          AI-Powered CSV Importer
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Upload a lead CSV, check the raw rows in your browser, and confirm
          only when the preview looks right.
        </p>

        <div className="mt-8 space-y-6">
          <FileUpload
            fileName={fileName}
            isParsing={isParsing || isImporting}
            onFileSelect={handleFileSelect}
          />

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
              {notice}
            </div>
          ) : null}

          <PreviewTable headers={headers} rows={rows} />

          {rows.length ? (
            <div className="flex justify-end">
              <button
                className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={isParsing || isImporting}
                onClick={handleConfirmImport}
                type="button"
              >
                {isImporting ? "Importing..." : "Confirm Import"}
              </button>
            </div>
          ) : null}

          <ImportResults result={importResult} />
        </div>
      </section>
    </main>
  );
}
