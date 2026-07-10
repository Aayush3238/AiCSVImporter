import { GoogleGenAI } from "@google/genai";
import {
  CRM_FIELDS,
  CRM_STATUSES,
  DATA_SOURCES,
  buildAiPrompt
} from "./aiPrompt.js";

const MODEL = "gemini-2.0-flash";

const crmDataProperties = CRM_FIELDS.reduce((properties, field) => {
  properties[field] = { type: "string" };
  return properties;
}, {});

const importSchema = {
  type: "object",
  required: ["records"],
  properties: {
    records: {
      type: "array",
      items: {
        type: "object",
        required: ["rowIndex", "status", "data", "reason"],
        properties: {
          rowIndex: { type: "integer" },
          status: { type: "string" },
          data: {
            type: "object",
            properties: crmDataProperties
          },
          reason: { type: "string" }
        }
      }
    }
  }
};

function makeGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });
}

async function callGemini({ headers, rows }) {
  const client = makeGeminiClient();
  const prompt = buildAiPrompt({ headers, rows });

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: importSchema
    }
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(text);
}

async function callGeminiWithRetry(args) {
  try {
    return await callGemini(args);
  } catch (firstError) {
    try {
      return await callGemini(args);
    } catch (secondError) {
      throw new Error(
        `Gemini batch failed after retry: ${secondError.message || firstError.message}`
      );
    }
  }
}

function sanitizeString(value) {
  return String(value || "").trim();
}

function buildEmptyData() {
  return CRM_FIELDS.reduce((data, field) => {
    data[field] = "";
    return data;
  }, {});
}

function sanitizeImportedRecord(record) {
  const data = buildEmptyData();

  CRM_FIELDS.forEach((field) => {
    data[field] = sanitizeString(record.data?.[field]);
  });

  if (!CRM_STATUSES.includes(data.crm_status)) {
    data.crm_status = "";
  }

  if (!DATA_SOURCES.includes(data.data_source)) {
    data.data_source = "";
  }

  if (!data.email && !data.mobile_without_country_code) {
    return {
      rowIndex: record.rowIndex,
      status: "skipped",
      reason: "No email or mobile number found"
    };
  }

  return {
    rowIndex: record.rowIndex,
    status: "imported",
    data
  };
}

function sanitizeSkippedRecord(record) {
  return {
    rowIndex: record.rowIndex,
    status: "skipped",
    reason: sanitizeString(record.reason) || "Skipped by AI mapping"
  };
}

function validateAndSanitizeAiResponse(aiResponse, batchRows) {
  const expectedRowIndexes = new Set(batchRows.map((row) => row.__rowIndex));
  const recordsByRowIndex = new Map();

  if (!aiResponse || !Array.isArray(aiResponse.records)) {
    throw new Error("AI response did not contain a records array.");
  }

  aiResponse.records.forEach((record) => {
    if (!expectedRowIndexes.has(record.rowIndex)) {
      return;
    }

    if (record.status === "imported") {
      recordsByRowIndex.set(record.rowIndex, sanitizeImportedRecord(record));
      return;
    }

    if (record.status === "skipped") {
      recordsByRowIndex.set(record.rowIndex, sanitizeSkippedRecord(record));
    }
  });

  batchRows.forEach((row) => {
    if (!recordsByRowIndex.has(row.__rowIndex)) {
      recordsByRowIndex.set(row.__rowIndex, {
        rowIndex: row.__rowIndex,
        status: "skipped",
        reason: "AI response did not include this row"
      });
    }
  });

  return Array.from(recordsByRowIndex.values()).sort(
    (first, second) => first.rowIndex - second.rowIndex
  );
}

export async function processBatchWithAi({ headers, batchRows }) {
  const rowsForPrompt = batchRows.map(({ __rowIndex, ...row }) => ({
    rowIndex: __rowIndex,
    ...row
  }));
  const aiResponse = await callGeminiWithRetry({
    headers,
    rows: rowsForPrompt
  });

  return validateAndSanitizeAiResponse(aiResponse, batchRows);
}
