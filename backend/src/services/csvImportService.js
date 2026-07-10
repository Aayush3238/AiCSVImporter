import Papa from "papaparse";

const BATCH_SIZE = 10;

const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description"
];

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

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

function findValueByHeader(row, headerOptions) {
  const entries = Object.entries(row);
  const match = entries.find(([key]) =>
    headerOptions.some((option) => key.toLowerCase().includes(option))
  );

  return match ? String(match[1] || "").trim() : "";
}

function findEmail(row) {
  const values = Object.values(row).map((value) => String(value || ""));
  const directEmail = findValueByHeader(row, ["email", "e-mail"]);

  if (EMAIL_REGEX.test(directEmail)) {
    return directEmail.match(EMAIL_REGEX)[0];
  }

  const valueWithEmail = values.find((value) => EMAIL_REGEX.test(value));
  return valueWithEmail ? valueWithEmail.match(EMAIL_REGEX)[0] : "";
}

function findMobile(row) {
  const phoneValue = findValueByHeader(row, [
    "phone",
    "mobile",
    "whatsapp",
    "contact",
    "number"
  ]);
  const values = phoneValue ? [phoneValue] : Object.values(row);
  const valueWithPhone = values
    .map((value) => String(value || ""))
    .find((value) => value.replace(/\D/g, "").length >= 7);

  if (!valueWithPhone) {
    return "";
  }

  return valueWithPhone.replace(/\D/g, "").slice(-10);
}

function createEmptyCrmRecord() {
  return CRM_FIELDS.reduce((record, field) => {
    record[field] = "";
    return record;
  }, {});
}

function normalizeRowForPhaseThree(row) {
  const email = findEmail(row);
  const mobile = findMobile(row);

  if (!email && !mobile) {
    return {
      rowIndex: row.__rowIndex,
      status: "skipped",
      reason: "No email or mobile number found"
    };
  }

  const data = {
    ...createEmptyCrmRecord(),
    name: findValueByHeader(row, ["name", "customer", "client"]),
    email,
    mobile_without_country_code: mobile,
    company: findValueByHeader(row, ["company", "organization"]),
    city: findValueByHeader(row, ["city", "area", "location"]),
    state: findValueByHeader(row, ["state"]),
    country: findValueByHeader(row, ["country"]),
    crm_note: "Temporary Phase 3 import. AI mapping will be added in Phase 4."
  };

  return {
    rowIndex: row.__rowIndex,
    status: "imported",
    data
  };
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

  const batches = chunkRows(rows);
  const records = [];
  const skippedRecords = [];

  batches.forEach((batch) => {
    batch.forEach((row) => {
      const processedRow = normalizeRowForPhaseThree(row);

      if (processedRow.status === "imported") {
        records.push(processedRow);
      } else {
        skippedRecords.push(processedRow);
      }
    });
  });

  return {
    total: rows.length,
    imported: records.length,
    skipped: skippedRecords.length,
    batchSize: BATCH_SIZE,
    batches: batches.map((batch, index) => ({
      batchNumber: index + 1,
      rowCount: batch.length,
      status: "processed"
    })),
    records,
    skippedRecords
  };
}
