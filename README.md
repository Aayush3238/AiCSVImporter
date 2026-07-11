# AI-Powered CSV Importer for GrowEasy

Hiring assignment project for uploading CSV lead files, previewing them locally, and normalizing them into a fixed GrowEasy CRM schema with Gemini AI.

## Project Overview

This app lets a user:

1. Upload a `.csv` file.
2. Preview the raw rows in the browser before any backend call.
3. Confirm the import.
4. Send the file to an Express backend.
5. Process rows in batches of 10, up to 3 batches concurrently.
6. Use Gemini structured output to map arbitrary columns into the GrowEasy CRM format.
7. Download the successfully normalized records as CSV or Excel.

The app is stateless. There is no database, auth, payments, or hidden background processing.

## Features

- Drag-and-drop and file picker upload
- Frontend-only CSV preview with Papa Parse
- File type, empty file, and parse error validation
- Responsive preview table with sticky headers and scrolling
- Confirm-before-import workflow
- Express backend import API with multer
- Batch processing in groups of 10 with 3 concurrent batches
- 5-minute request timeout on import endpoint
- Gemini structured JSON output with retry logic
- Validation and sanitization of AI output on the backend
- Imported and skipped record summary with batch status badges
- Skipped records viewer with original data and skip reasons
- CSV download for normalized records
- Excel download with auto-sized columns
- Animated progress indicator during import
- React.memo optimization for large datasets
- Clean responsive UI

## Current Status

The project is feature-complete. The core import flow works end-to-end with AI-powered normalization, parallel batch processing, and export functionality.

## Architecture

Frontend:

- Next.js App Router
- JavaScript
- Tailwind CSS
- Papa Parse for local preview and CSV export
- xlsx for Excel export
- React.memo for render optimization

Backend:

- Node.js (ESM)
- Express
- multer for file upload
- Papa Parse for backend CSV parsing
- Gemini API for mapping rows to the CRM schema
- Parallel batch processing (3 concurrent)
- 5-minute request timeout

Shared:

- `/shared/constants.js` — CRM fields, statuses, and data sources used by both frontend and backend

Flow:

1. Frontend parses the file locally for preview only.
2. User confirms the import.
3. Frontend sends the file to `POST /api/import`.
4. Backend parses rows and splits them into batches of 10.
5. Up to 3 batches are sent to Gemini concurrently.
6. Backend validates and sanitizes the JSON response.
7. Backend returns imported and skipped records to the frontend.
8. User can download results as CSV or Excel.

## Folder Structure

```text
/shared
  constants.js          # CRM fields, statuses, data sources

/frontend
  /app
    page.js             # Main page with state management
    layout.js           # Root layout
    globals.css         # Tailwind styles
  /components
    FileUpload.js       # Drag-and-drop upload component
    PreviewTable.js     # CSV preview table
    ImportResults.js    # Results display + CSV/Excel download
  package.json
  .env.example

/backend
  /src
    server.js           # Express app entry point
    /routes
      importRoutes.js   # POST /api/import with timeout
    /services
      aiPrompt.js       # CRM schema + Gemini prompt builder
      csvImportService.js      # CSV validation + parallel batching
      geminiImportService.js   # Gemini API client + retry logic
  package.json
  .env.example

README.md
```

## Local Setup

### Backend

From `/backend`:

```bash
npm install
cp .env.example .env   # Fill in GEMINI_API_KEY
npm run dev
```

### Frontend

From `/frontend`:

```bash
npm install
cp .env.example .env.local   # Set NEXT_PUBLIC_BACKEND_URL
npm run dev
```

## Environment Variables

### Backend `.env`

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env.local`

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

Limits:

- Max file size: 5 MB
- Request timeout: 5 minutes

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
- Downloaded files contain only successfully imported rows.

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

## Testing Instructions

### Manual checks

1. Start backend and frontend locally.
2. Upload a valid CSV.
3. Verify preview renders before any backend call.
4. Click `Confirm Import`.
5. Verify the progress indicator appears.
6. Verify results render with batch status badges.
7. Verify downloaded CSV and Excel open correctly.
8. Toggle skipped records view and verify original data + reasons.

### Build checks

From `/frontend`:

```bash
npm run build
```

### Backend syntax checks

From `/backend`:

```bash
node --check src/server.js
node --check src/routes/importRoutes.js
node --check src/services/csvImportService.js
node --check src/services/geminiImportService.js
node --check src/services/aiPrompt.js
```
