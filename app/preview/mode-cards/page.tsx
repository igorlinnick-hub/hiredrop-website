"use client";

import { useState } from "react";
import LaunchModeCards from "@/components/dashboard/LaunchModeCards";

// TEMPORARY preview — public, so the Auto/Tap cards can be seen in isolation
// (light + dark) without the dashboard's campaign state. Safe to delete.
export default function PreviewModeCards() {
  const [mode, setMode] = useState<"auto" | "tap">("auto");
  const [dark, setDark] = useState(false);
  return (
    <div className={`hd-dash-root ${dark ? "dark" : ""} min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-6`}>
      <button
        onClick={() => setDark((d) => !d)}
        className="text-xs font-medium text-text2 border border-border rounded-full px-3 py-1 hover:text-text"
      >
        {dark ? "☀︎ Day" : "☾ Night"}
      </button>
      <div className="w-full max-w-md">
        <LaunchModeCards mode={mode} onAuto={() => setMode("auto")} onTap={() => setMode("tap")} />
      </div>
      <p className="text-xs text-text2/60">Click a card to see its active state.</p>
    </div>
  );
}
