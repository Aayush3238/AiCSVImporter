import OpenAI from "openai";
import {
  CRM_FIELDS,
  CRM_STATUSES,
  DATA_SOURCES,
  buildAiPrompt
} from "./aiPrompt.js";

const MODEL = "gpt-4o-mini";

const crmDataProperties = CRM_FIELDS.reduce((properties, field) => {
  properties[field] = { type: "string" };
  return properties;
}, {});

const importSchema = {
  type: "object",
  additionalProperties: false,
  required: ["records"],
  properties: {
    records: {
      type: "array",
      items: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["rowIndex", "status", "data"],
            properties: {
              rowIndex: { type: "integer" },
              status: { type: "string", enum: ["imported"] },
              data: {
                type: "object",
                additionalProperties: false,
                required: CRM_FIELDS,
                properties: crmDataProperties
              }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["rowIndex", "status", "reason"],
            properties: {
              rowIndex: { type: "integer" },
              status: { type: "string", enum: ["skipped"] },
              reason: { type: "string" }
            }
          }
        ]
      }
    }
  }
};

function makeOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

function getResponseText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  const message = response.output?.find((item) => item.type === "message");
  const outputText = message?.content?.find(
    (content) => content.type === "output_text"
  );

  return outputText?.text || "";
}

async function callOpenAi({ headers, rows }) {
  const client = makeOpenAiClient();
  const prompt = buildAiPrompt({ headers, rows });

  const response = await client.responses.create({
    model: MODEL,
    input: prompt,
    temperature: 0,
    text: {
      format: {
        type: "json_schema",
        name: "groweasy_import_batch",
        strict: true,
        schema: importSchema
      }
    }
  });

  const text = getResponseText(response);

  if (!text) {
    throw new Error("OpenAI returned an empty response.");
  }

  return JSON.parse(text);
}

async function callOpenAiWithRetry(args) {
  try {
    return await callOpenAi(args);
  } catch (firstError) {
    try {
      return await callOpenAi(args);
    } catch (secondError) {
      throw new Error(
        `OpenAI batch failed after retry: ${secondError.message || firstError.message}`
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
  const aiResponse = await callOpenAiWithRetry({
    headers,
    rows: rowsForPrompt
  });

  return validateAndSanitizeAiResponse(aiResponse, batchRows);
}

