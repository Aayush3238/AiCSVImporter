export const CRM_FIELDS = [
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

export const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE"
];

export const DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots"
];

export function buildAiPrompt({ headers, rows }) {
  return `
You are normalizing uploaded CSV lead records into the GrowEasy CRM schema.

Return valid JSON only. Do not include markdown, comments, or explanations.

The output object must have exactly this top-level shape:
{
  "records": [
    {
      "rowIndex": 0,
      "status": "imported",
      "data": {
        "created_at": "",
        "name": "",
        "email": "",
        "country_code": "",
        "mobile_without_country_code": "",
        "company": "",
        "city": "",
        "state": "",
        "country": "",
        "lead_owner": "",
        "crm_status": "",
        "crm_note": "",
        "data_source": "",
        "possession_time": "",
        "description": ""
      }
    },
    {
      "rowIndex": 1,
      "status": "skipped",
      "reason": "No email or mobile number found"
    }
  ]
}

CRM schema:
Every imported record must use exactly these fields and no other fields:
${CRM_FIELDS.map((field) => `- ${field}`).join("\n")}

Mapping rules:
- Map arbitrary CSV headings and values into the CRM fields.
- Headings may include variations such as Full Name, Customer, Phone No., WhatsApp, Email Address, Remarks, Lead Stage, Area, Location, Project, Source, or similar labels.
- Skip a record only when it contains neither an email nor a mobile number.
- If a row has an email but no mobile, import it.
- If a row has a mobile but no email, import it.
- If multiple emails exist, use the first email in "email" and append the others to "crm_note".
- If multiple mobile numbers exist, use the first mobile number in "mobile_without_country_code" and append the others to "crm_note".
- Split mobile numbers into "country_code" and "mobile_without_country_code" when the country code is clearly present.
- Put remarks, follow-up details, extra contact details, and useful unmatched data into "crm_note".
- "created_at" must be a value that JavaScript can parse with new Date(created_at). Leave blank if unknown.
- "crm_status" must be blank or one of: ${CRM_STATUSES.join(", ")}.
- "data_source" must be blank or one of: ${DATA_SOURCES.join(", ")}.
- If a status or data source cannot be mapped confidently, leave it blank.
- Do not invent contact information or facts.
- Preserve the original rowIndex exactly.
- Return one output record for every input row.

CSV headers:
${JSON.stringify(headers)}

Current batch rows:
${JSON.stringify(rows, null, 2)}
`.trim();
}

