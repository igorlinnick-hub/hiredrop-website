"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

type FitMode = "broad" | "standard" | "precise";

const MODES: { id: FitMode; label: string; hint: string }[] = [
  { id: "broad", label: "Broad", hint: "Score ≥ 35 — explore the market, skip only clearly unrelated roles" },
  { id: "standard", label: "Standard", hint: "Score ≥ 55 — roles that match your experience (the usual default)" },
  { id: "precise", label: "Precise", hint: "Score ≥ 70 — only strong matches, fewer applications" },
];

/**
 * Compact header control for fit strictness (Broad / Standard / Precise) — replaces
 * the segmented slab that lived in the filter row. A target icon + the current mode
 * opens a small popover; persists profile.apply_mode via the same endpoint.
 */
export default function FitModeMenu() {
  const [mode, setMode] = useState<FitMode>("standard");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function save(next: FitMode) {
    setOpen(false);
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

  const current = MODES.find((m) => m.id === mode) || MODES[1];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Match strictness: ${current.label}`}
        className="profile-trigger flex items-center gap-1.5 rounded-full border border-border pl-2 pr-2 py-1
          text-text2 hover:text-text hover:border-accent/40 transition"
      >
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"
          strokeLinecap="round">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        <span className="hidden sm:inline text-xs font-semibold">{current.label}</span>
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" strokeWidth={2}
          viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="profile-menu absolute right-0 top-[calc(100%+10px)] w-64 rounded-2xl border border-border
            bg-surface shadow-xl p-2 z-50"
        >
          <p className="px-2 pt-1 pb-1.5 text-[11px] uppercase tracking-wide text-text2/70">Match strictness</p>
          {MODES.map((m) => {
            const selected = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => save(m.id)}
                className={[
                  "w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition",
                  selected ? "bg-accent/10" : "hover:bg-surface2",
                ].join(" ")}
              >
                <span className={[
                  "mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center border",
                  selected ? "bg-accent border-accent text-white" : "border-border text-transparent",
                ].join(" ")}>
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3}
                    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${selected ? "text-accent" : "text-text"}`}>{m.label}</span>
                  <span className="block text-[11px] text-text2 leading-snug">{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
