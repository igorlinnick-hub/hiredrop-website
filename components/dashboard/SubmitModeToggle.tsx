"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Compact Auto/Tap segmented toggle. Persists profile.submit_mode AND flips the
// extension's live reviewMode (HIREDROP_SET_REVIEW via ping.js) so the choice takes
// effect mid-campaign — the running campaign starts/stops pausing for your approval
// immediately, not only on the next start.
//   Auto = HireDrop fills + sends for you.
//   Tap  = it fills, then a card in the automation window waits for your Submit.
export default function SubmitModeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<"auto" | "tap">("auto");

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("submit_mode")
          .eq("user_id", user.id)
          .single();
        const m = data?.submit_mode === "tap" ? "tap" : "auto";
        setMode(m);
        // Sync the extension's live review flag to the SAVED mode on mount — critical:
        // without this, a user whose profile is already "tap" (so they never re-click)
        // could start/continue a campaign with the extension still in auto → it would
        // auto-submit unreviewed. This also flips the dashboard to the review panel.
        window.postMessage({ type: "HIREDROP_SET_REVIEW", on: m === "tap" }, "*");
      } catch {
        /* ignore — default stays auto */
      }
    })();
  }, []);

  async function save(next: "auto" | "tap") {
    if (next === mode) return;
    const prev = mode;
    setMode(next); // optimistic
    // Flip the extension's live review-stop immediately (works while a campaign runs).
    try {
      window.postMessage({ type: "HIREDROP_SET_REVIEW", on: next === "tap" }, "*");
    } catch {
      /* extension absent — profile write below still records the choice */
    }
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMode(prev); return; }
      const { error } = await supabase
        .from("profiles")
        .update({ submit_mode: next })
        .eq("user_id", user.id);
      if (error) setMode(prev);
    } catch {
      setMode(prev);
    }
  }

  return (
    <div
      className={["inline-flex items-center rounded-xl border border-border bg-surface p-0.5", className].join(" ")}
      role="group"
      aria-label="Submit mode"
    >
      <button
        type="button"
        onClick={() => save("auto")}
        aria-pressed={mode === "auto"}
        title="Auto — HireDrop fills and sends applications for you"
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition",
          mode === "auto" ? "bg-accent text-white shadow-sm" : "text-text2 hover:text-text",
        ].join(" ")}
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11 2 4 11h4l-1 7 7-9h-4l1-7z" />
        </svg>
        Auto
      </button>
      <button
        type="button"
        onClick={() => save("tap")}
        aria-pressed={mode === "tap"}
        title="Tap — you review and approve each application before it sends"
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition",
          mode === "tap" ? "bg-accent text-white shadow-sm" : "text-text2 hover:text-text",
        ].join(" ")}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M9 11V6a2 2 0 1 1 4 0v5m0-2a2 2 0 1 1 4 0v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7l-2-3a2 2 0 0 1 3.3-2.2L7.5 13" />
        </svg>
        Tap
      </button>
    </div>
  );
}
