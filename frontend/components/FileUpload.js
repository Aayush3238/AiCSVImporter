"use client";

export default function FileUpload({ fileName, isParsing, onFileSelect }) {
  function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];

    if (file) {
      onFileSelect(file);
    }
  }

  return (
    <div
      className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-sm transition hover:border-emerald-500"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700">
          CSV
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">
          Upload lead CSV
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Drag and drop a CSV file here, or choose one from your computer.
          Preview happens locally in your browser.
        </p>

        <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800">
          Choose CSV file
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            disabled={isParsing}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onFileSelect(file);
              }

              event.target.value = "";
            }}
          />
        </label>

        <p className="mt-4 min-h-5 text-sm text-slate-500">
          {isParsing
            ? "Reading CSV..."
            : fileName
              ? `Selected: ${fileName}`
              : "No file selected"}
        </p>
      </div>
    </div>
  );
}
