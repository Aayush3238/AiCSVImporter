# AI-Powered CSV Importer for GrowEasy

Hiring assignment project for uploading CSV lead files, previewing them locally, and normalizing them into a fixed GrowEasy CRM schema with Gemini AI.

## Project Overview

This app lets a user:

1. Upload a `.csv` file.
2. Preview the raw rows in the browser before any backend call.
3. Confirm the import.
4. Send the file to an Express backend.
5. Process rows in batches of 10.
6. Use Gemini structured output to map arbitrary columns into the GrowEasy CRM format.
7. Download the successfully normalized records as CSV.

The app is stateless. There is no database, auth, payments, or hidden background processing.

## Features

- Drag-and-drop and file picker upload
- Frontend-only CSV preview with Papa Parse
- File type, empty file, and parse error validation
- Responsive preview table with sticky headers and scrolling
- Confirm-before-import workflow
- Express backend import API with multer
- Batch processing in groups of 10
- Gemini structured JSON output
- Retry once on Gemini batch failure
- Validation and sanitization of AI output on the backend
- Imported and skipped record summary
- CSV download for normalized records
- Clean responsive UI suitable for a hiring assignment

## Current Status

Phase 5 is complete:

- CSV preview works locally in the browser
- Backend import works
- Gemini batch mapping is wired in
- Normalized records can be downloaded as CSV

## Architecture

Frontend:

- Next.js App Router
- JavaScript
- Tailwind CSS
- Papa Parse for local preview parsing

Backend:

- Node.js
- Express
- multer for file upload
- Papa Parse for backend CSV parsing
- Gemini API for mapping rows to the CRM schema

Flow:

1. Frontend parses the file locally for preview only.
2. User confirms the import.
3. Frontend sends the file to `POST /api/import`.
4. Backend parses rows and splits them into batches of 10.
5. Each batch is sent to Gemini.
6. Backend validates and sanitizes the JSON response.
7. Backend returns imported and skipped records to the frontend.

## Folder Structure

```text
/frontend
  /app
  /components
  package.json
  .env.example

/backend
  /src
    /routes
    /services
    server.js
  package.json
  .env.example

README.md
```

## Local Setup

### Backend

From `/backend`:

```bash
npm install
npm run dev
```

### Frontend

From `/frontend`:

```bash
npm install
npm run dev
```

## Environment Variables

### Backend `.env`

From `/backend/.env.example`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env`

From `/frontend/.env.example`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## How the AI Mapping Works

The backend sends each batch to Gemini with:

- the CSV headers
- the current batch of rows
- the exact GrowEasy CRM schema
- the allowed enum values
- the skip rule
- the instruction to return JSON only
- the instruction not to fabricate values

The exact CRM fields are:

```text
created_at
name
email
country_code
mobile_without_country_code
company
city
state
country
lead_owner
crm_status
crm_note
data_source
possession_time
description
```

Allowed `crm_status` values:

```text
GOOD_LEAD_FOLLOW_UP
DID_NOT_CONNECT
BAD_LEAD
SALE_DONE
```

Allowed `data_source` values:

```text
leads_on_demand
meridian_tower
eden_park
varah_swamy
sarjapur_plots
```

Mapping rules:

- Skip only when a row has neither email nor mobile.
- Use the first email if multiple are present.
- Use the first mobile if multiple are present.
- Put remarks, follow-up details, and useful unmatched data into `crm_note`.
- Leave status or data source blank if the mapping is not confident.
- Preserve the original row index.
- Do not invent facts.

## API Documentation

### `GET /api/health`

Returns a basic health response.

Example response:

```json
{
  "status": "ok",
  "service": "groweasy-csv-importer-backend"
}
```

### `POST /api/import`

Accepts a CSV file using multipart form data.

Field name:

- `file`

Response shape:

```json
{
  "total": 2,
  "imported": 1,
  "skipped": 1,
  "batchSize": 10,
  "batches": [
    {
      "batchNumber": 1,
      "rowCount": 2,
      "status": "processed"
    }
  ],
  "records": [
    {
      "rowIndex": 0,
      "status": "imported",
      "data": {
        "created_at": "",
        "name": "Anaya Rao",
        "email": "anaya@example.com",
        "country_code": "",
        "mobile_without_country_code": "9876543210",
        "company": "",
        "city": "Bengaluru",
        "state": "",
        "country": "",
        "lead_owner": "",
        "crm_status": "",
        "crm_note": "",
        "data_source": "",
        "possession_time": "",
        "description": ""
      }
    }
  ],
  "skippedRecords": [
    {
      "rowIndex": 1,
      "status": "skipped",
      "reason": "No email or mobile number found"
    }
  ]
}
```

Error response example:

```json
{
  "error": "Please upload a valid .csv file."
}
```

## Sample CSV Format

Any reasonable lead column names are accepted. Example:

```csv
Full Name,Email Address,Phone No.,City,Remarks,Lead Stage
Anaya Rao,anaya@example.com,9876543210,Bengaluru,Interested in Eden Park,Hot Lead
No Contact,,,Hyderabad,Missing contact details,Cold Lead
```

## Known Limitations

- AI output quality depends on the source CSV and the model response.
- `crm_status` and `data_source` are left blank when the mapping is not confident.
- If Gemini is unavailable, the batch is returned as skipped with a technical reason.
- The app is stateless by design, so imports are not stored in a database.
- Downloaded CSV contains only successfully imported rows.

## Deployment Steps

### Frontend on Vercel

1. Push the repo to GitHub.
2. Import the repository into Vercel.
3. Set `NEXT_PUBLIC_BACKEND_URL` to your deployed backend URL.
4. Deploy the frontend.

### Backend on Render or Railway

1. Create a new Node.js service.
2. Set the root directory to `backend`.
3. Install dependencies with `npm install`.
4. Set environment variables:
   - `GEMINI_API_KEY`
   - `PORT`
   - `FRONTEND_URL`
5. Deploy the backend.

### Important deployment note

The frontend must point to the deployed backend URL, not `localhost`.

## Screenshots

Add screenshots here after deployment:

- `![Preview screen](docs/screenshots/preview.png)`
- `![Import results](docs/screenshots/results.png)`
- `![Mobile preview](docs/screenshots/mobile.png)`

## Testing Instructions

### Manual checks

1. Start backend and frontend locally.
2. Upload a valid CSV.
3. Verify preview renders before any backend call.
4. Click `Confirm Import`.
5. Verify results render.
6. Verify downloaded CSV opens correctly.

### Build checks

From `/frontend`:

```bash
npm run build
```

### Backend checks

From `/backend`:

```bash
node --check src/server.js
node --check src/services/csvImportService.js
node --check src/services/geminiImportService.js
node --check src/services/aiPrompt.js
```

## Final Notes

This repository is intentionally scoped to the assignment requirements only. It avoids database, auth, and unrelated product features so the import flow stays easy to review and extend.
