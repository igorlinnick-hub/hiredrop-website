"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

export type FitMode = "broad" | "standard" | "precise";

const MODES: { id: FitMode; label: string; tagline: string; threshold: string; blurb: string }[] = [
  { id: "broad", label: "Broad", tagline: "Explore the market", threshold: "≥ 35",
    blurb: "Apply widely across your industry — maximum exposure. Skips only clearly unrelated roles." },
  { id: "standard", label: "Standard", tagline: "Focused by specialty", threshold: "≥ 55",
    blurb: "Roles that match your experience — balanced volume vs relevance. The usual default." },
  { id: "precise", label: "Precise", tagline: "Only the best match", threshold: "≥ 70",
    blurb: "Only strong matches to your ideal role. Fewer applications, highest relevance." },
];

// Launch-time fit picker. Instead of a buried Settings toggle, the strictness for THIS
// run is chosen right after pressing Start: pick a mode → it saves profile.apply_mode →
// onConfirm proceeds to actually start the campaign. Defaults the highlight to Broad
// (what most first-runs want) but the pick is the confirm.
export default function FitChoiceModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: FitMode) => void;
}) {
  const [saving, setSaving] = useState<FitMode | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Optional salary filter — kept as raw input strings; empty = don't filter.
  const [salMin, setSalMin] = useState("");
  const [salMax, setSalMax] = useState("");
  const [listedOnly, setListedOnly] = useState(false);
  const salLoadedRef = useRef(false);

  // Prefill from the profile once per mount — otherwise reopening the modal with
  // empty fields would silently wipe a previously saved range on the next pick.
  useEffect(() => {
    if (!open || salLoadedRef.current) return;
    salLoadedRef.current = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("salary_min, salary_max, salary_listed_only")
          .eq("user_id", user.id)
          .single();
        if (data?.salary_min) setSalMin(String(data.salary_min));
        if (data?.salary_max) setSalMax(String(data.salary_max));
        setListedOnly(!!data?.salary_listed_only);
      } catch { /* columns may not exist yet — leave the fields empty */ }
    })();
  }, [open]);

  if (!open) return null;

  async function pick(mode: FitMode) {
    if (saving) return;
    setSaving(mode);
    setErr(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch(`${API_BASE}/api/v1/profile/apply-mode`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ apply_mode: mode }),
          cache: "no-store",
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
        // Salary is an OPTIONAL filter — fire-and-forget so it can never block
        // Start (also tolerates a backend that doesn't have the endpoint yet).
        const bound = (s: string) => {
          const n = parseInt(s, 10);
          return Number.isFinite(n) && n > 0 ? n : null;
        };
        fetch(`${API_BASE}/api/v1/profile/salary`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            salary_min: bound(salMin),
            salary_max: bound(salMax),
            salary_listed_only: listedOnly,
          }),
          cache: "no-store",
        }).catch(() => {});
      }
      onConfirm(mode);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSaving(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={saving ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fitIn .18s ease" }}>
        <style>{`@keyframes fitIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}`}</style>

        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-lg font-bold text-text">How selective this run?</h3>
          <button onClick={onClose} disabled={!!saving}
            className="text-text2/50 hover:text-text transition disabled:opacity-40 -mr-1 -mt-1 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-text2/70 mb-4">Pick the fit strictness for this campaign — you can change it next run.</p>

        <div className="space-y-2.5">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => pick(m.id)} disabled={!!saving}
              className="w-full text-left rounded-xl border border-border bg-surface2/40 p-3.5
                hover:border-accent/60 hover:bg-accent/[0.04] disabled:opacity-50 transition
                flex items-start gap-3 group">
              <span className="mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded-md
                bg-accent/12 text-accent text-[11px] font-bold tabular-nums">{m.threshold}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-text">{m.label}</span>
                  <span className="text-xs text-text2/60">· {m.tagline}</span>
                </span>
                <span className="block text-xs text-text2 mt-0.5 leading-relaxed">{m.blurb}</span>
              </span>
              {saving === m.id && (
                <span className="mt-1 w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Optional salary filter — saved together with the pick; empty = no filter */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-text2/70">
            Salary range <span className="font-normal text-text2/45">(optional, annual USD)</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="relative flex-1">
              <span aria-hidden className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text2/50">$</span>
              <input type="number" inputMode="numeric" min={0} step={5000} placeholder="Min"
                value={salMin} onChange={(e) => setSalMin(e.target.value)} disabled={!!saving}
                className="w-full pl-6 pr-2.5 py-1.5 text-sm bg-surface2/40 border border-border rounded-lg
                  text-text placeholder:text-text2/40 focus:outline-none focus:border-accent/50 transition" />
            </div>
            <span aria-hidden className="text-text2/40">—</span>
            <div className="relative flex-1">
              <span aria-hidden className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text2/50">$</span>
              <input type="number" inputMode="numeric" min={0} step={5000} placeholder="Max"
                value={salMax} onChange={(e) => setSalMax(e.target.value)} disabled={!!saving}
                className="w-full pl-6 pr-2.5 py-1.5 text-sm bg-surface2/40 border border-border rounded-lg
                  text-text placeholder:text-text2/40 focus:outline-none focus:border-accent/50 transition" />
            </div>
          </div>
          <button type="button" role="switch" aria-checked={listedOnly} disabled={!!saving}
            onClick={() => setListedOnly((v) => !v)}
            className="mt-2.5 flex items-center gap-2 text-xs text-text2 hover:text-text transition">
            <span className={`relative w-7 h-4 rounded-full transition-colors ${listedOnly ? "bg-accent" : "bg-border"}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${listedOnly ? "left-3.5" : "left-0.5"}`} />
            </span>
            Only jobs that list salary
          </button>
        </div>

        {err && <p className="text-xs text-red mt-3">{err}</p>}
      </div>
    </div>
  );
}
