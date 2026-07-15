/**
 * Generic instant loading state for every page under (app).
 *
 * The App Router shows this the moment you tap a nav item, so the content area
 * swaps to a skeleton immediately instead of leaving the previous page frozen
 * until the server finishes. NavShell (from the layout) stays put — only the
 * page body is replaced. Individual routes can add their own loading.tsx to
 * override this with a more tailored skeleton.
 *
 * Plain static markup only — no data, no client/server interplay.
 */
export default function AppLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-9 w-40 rounded-lg skeleton mb-6" />
      <div className="space-y-4">
        <div className="h-32 w-full rounded-2xl skeleton" />
        <div className="h-32 w-full rounded-2xl skeleton" />
        <div className="h-32 w-full rounded-2xl skeleton" />
      </div>
    </div>
  );
}
