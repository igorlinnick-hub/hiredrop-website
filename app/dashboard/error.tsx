"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] render failed:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text">Dashboard couldn't load</h2>
        <p className="text-sm text-text2">
          Something went wrong while rendering your dashboard. Your data is safe — just the page failed to draw.
        </p>
        <pre className="text-xs text-text2 bg-surface2 rounded p-3 overflow-auto whitespace-pre-wrap break-words max-h-40">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={unstable_retry}
            className="px-3 py-1.5 text-sm rounded-lg bg-accent text-white hover:opacity-90 transition"
          >
            Try again
          </button>
          <a
            href="/dashboard/settings"
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-text hover:bg-surface2 transition"
          >
            Open settings
          </a>
        </div>
      </div>
    </div>
  );
}
