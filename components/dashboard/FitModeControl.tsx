"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

type FitMode = "broad" | "standard" | "precise";

const MODES: { id: FitMode; label: string; hint: string }[] = [
  { id: "broad", label: "Broad", hint: "Score ≥ 35 — explore the market, skip only clearly unrelated roles" },
  { id: "standard", label: "Standard", hint: "Score ≥ 55 — roles that match your experience (the usual default)" },
  { id: "precise", label: "Precise", hint: "Score ≥ 70 — only strong matches, fewer applications" },
];

// Persistent fit-strictness control on the dashboard (Igor 2026-07-16): moved OUT of the
// launch popup — the user flips it calmly here, the launch flow stops asking every time.
// Persists profile.apply_mode via the same endpoint the old panel/modal used.
export default function FitModeControl({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<FitMode>("standard");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles").select("apply_mode").eq("user_id", user.id).single();
        const m = (data?.apply_mode as FitMode) || "standard";
        if (["broad", "standard", "precise"].includes(m)) setMode(m);
      } catch { /* default stays */ }
    })();
  }, []);

  async function save(next: FitMode) {
    if (next === mode || saving) return;
    const prev = mode;
    setMode(next);
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setMode(prev); return; }
      const res = await fetch(`${API_BASE}/api/v1/profile/apply-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ apply_mode: next }),
        cache: "no-store",
      });
      if (!res.ok) setMode(prev);
    } catch {
      setMode(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={["inline-flex items-center gap-1.5", className].join(" ")}>
      <span className="text-[11px] font-medium text-text2/60">Fit:</span>
      <div className="inline-flex items-center rounded-full border border-border bg-surface p-0.5"
        role="group" aria-label="Fit strictness">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => save(m.id)}
            title={m.hint}
            aria-pressed={mode === m.id}
            className={[
              "px-3 py-1 text-xs font-semibold rounded-full transition",
              mode === m.id ? "bg-accent text-white shadow-sm" : "text-text2 hover:text-text",
            ].join(" ")}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
