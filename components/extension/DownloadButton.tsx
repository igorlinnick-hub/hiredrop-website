"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

interface Props {
  token: string;
}

export default function DownloadButton({ token }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/extension/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jobflow-extension.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button size="lg" onClick={download} disabled={busy}>
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {busy ? "Preparing…" : "Download Extension"}
      </Button>
      {error && <p className="text-sm text-red">{error}</p>}
    </div>
  );
}
