import Papa from "papaparse";
import { processBatchWithAi } from "./geminiImportService.js";

const BATCH_SIZE = 10;

function makeHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isValidCsvFile(file) {
  const hasCsvName = file.originalname.toLowerCase().endsWith(".csv");
  const hasCsvMime =
    file.mimetype === "text/csv" ||
    file.mimetype === "application/vnd.ms-excel" ||
    file.mimetype === "application/octet-stream";

  return hasCsvName || hasCsvMime;
}

function chunkRows(rows) {
  const batches = [];

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    batches.push(rows.slice(index, index + BATCH_SIZE));
  }

  return batches;
}

function parseCsv(csvText) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        if (result.errors.length) {
          const firstError = result.errors[0];
          reject(
            makeHttpError(
              `CSV parsing error on row ${firstError.row ?? "unknown"}: ${firstError.message}`
            )
          );
          return;
        }

        resolve(result);
      },
      error: (error) => {
        reject(makeHttpError(error.message || "Unable to parse CSV file."));
      }
    });
  });
}

export async function processCsvImport(file) {
  if (!file) {
    throw makeHttpError("CSV file is required.");
  }

  if (!isValidCsvFile(file)) {
    throw makeHttpError("Please upload a valid .csv file.");
  }

  if (!file.buffer?.length) {
    throw makeHttpError("The selected CSV file is empty.");
  }

  const csvText = file.buffer.toString("utf8").trim();

  if (!csvText) {
    throw makeHttpError("The selected CSV file is empty.");
  }

  const result = await parseCsv(csvText);
  const rows = result.data
    .filter((row) =>
      Object.values(row).some((value) => String(value || "").trim() !== "")
    )
    .map((row, index) => ({
      ...row,
      __rowIndex: index
    }));

  if (!result.meta.fields?.filter(Boolean).length) {
    throw makeHttpError("The CSV does not contain usable column headers.");
  }

  if (!rows.length) {
    throw makeHttpError("The CSV has headers but no data rows to import.");
  }

  const headers = result.meta.fields.filter(Boolean);
  const batches = chunkRows(rows);
  const records = [];
  const skippedRecords = [];
  const batchResults = [];

  for (const [index, batch] of batches.entries()) {
    try {
      const processedRows = await processBatchWithAi({
        headers,
        batchRows: batch
      });

      processedRows.forEach((processedRow) => {
        if (processedRow.status === "imported") {
          records.push(processedRow);
        } else {
          skippedRecords.push(processedRow);
        }
      });

      batchResults.push({
        batchNumber: index + 1,
        rowCount: batch.length,
        status: "processed"
      });
    } catch (error) {
      batch.forEach((row) => {
        skippedRecords.push({
          rowIndex: row.__rowIndex,
          status: "skipped",
          reason: error.message || "AI batch processing failed"
        });
      });

      batchResults.push({
        batchNumber: index + 1,
        rowCount: batch.length,
        status: "failed",
        reason: error.message || "AI batch processing failed"
      });
    }
  }

  records.sort((first, second) => first.rowIndex - second.rowIndex);
  skippedRecords.sort((first, second) => first.rowIndex - second.rowIndex);

  return {
    total: rows.length,
    imported: records.length,
    skipped: skippedRecords.length,
    batchSize: BATCH_SIZE,
    batches: batchResults,
    records,
    skippedRecords
  };
}
