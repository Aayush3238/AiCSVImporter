export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          GrowEasy
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          AI-Powered CSV Importer
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Phase 1 is running. The next phase will add CSV upload, validation,
          and local preview before any backend or AI processing happens.
        </p>
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Backend health check
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Start the backend and visit{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-900">
              http://localhost:5000/api/health
            </code>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
