"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

type Mode = "broad" | "standard" | "precise";

const MODES: { id: Mode; label: string; tagline: string; detail: string; threshold: string }[] = [
  {
    id: "broad",
    label: "Broad",
    tagline: "Explore the market",
    detail: "Apply widely across your industry. Great for early search or when you want maximum exposure. Skips only clearly unrelated roles.",
    threshold: "Score ≥ 35",
  },
  {
    id: "standard",
    label: "Standard",
    tagline: "Focused by specialty",
    detail: "Apply to roles that match your experience and job type. Balanced between volume and relevance — the right default for most searches.",
    threshold: "Score ≥ 55",
  },
  {
    id: "precise",
    label: "Precise",
    tagline: "Only the best match",
    detail: "Describe your ideal role below. AI compares every listing against it and skips anything that deviates significantly.",
    threshold: "Score ≥ 70",
  },
];

async function apiPost(path: string, token: string, body: unknown) {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export default function ApplyModePanel() {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("standard");
  const [idealDesc, setIdealDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  }, [supabase]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("apply_mode, ideal_job_description")
        .eq("user_id", user.id)
        .single();
      if (p) {
        setMode((p.apply_mode as Mode) || "standard");
        setIdealDesc(p.ideal_job_description || "");
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      await apiPost("/profile/apply-mode", token, {
        apply_mode: mode,
        ideal_job_description: mode === "precise" ? idealDesc : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <section className="bg-surface border border-border rounded-xl p-6">
        <div className="h-4 w-32 bg-surface2 rounded animate-pulse" />
      </section>
    );
  }

  return (
    <section className="bg-surface border border-border rounded-xl p-6 space-y-5">
      <div>
        <h3 className="font-semibold text-text">Apply Mode</h3>
        <p className="text-sm text-text2 mt-0.5">
          Controls how selective the AI is when deciding which jobs to apply to.
        </p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`text-left rounded-xl border p-4 transition-all ${
                active
                  ? "border-accent bg-accent/5 ring-1 ring-accent"
                  : "border-border hover:border-accent/40 hover:bg-surface2"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`font-semibold text-sm ${active ? "text-accent" : "text-text"}`}>
                  {m.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  active ? "bg-accent/15 text-accent" : "bg-surface2 text-text2"
                }`}>
                  {m.threshold}
                </span>
              </div>
              <p className={`text-xs font-medium mb-1 ${active ? "text-accent/80" : "text-text2"}`}>
                {m.tagline}
              </p>
              <p className="text-xs text-text2 leading-relaxed">{m.detail}</p>
              {active && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-[10px] text-accent font-medium">Active</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Precise mode: ideal job textarea */}
      {mode === "precise" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text">
            Describe your ideal job
          </label>
          <p className="text-xs text-text2">
            Be specific — role level, industry, responsibilities, must-haves. AI compares every listing against this description and skips poor matches.
          </p>
          <textarea
            value={idealDesc}
            onChange={(e) => setIdealDesc(e.target.value)}
            rows={4}
            placeholder="e.g. Senior Social Media Manager, remote, SaaS or tech company, $80k+, managing paid social and organic content, team lead role, no agency work"
            className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-surface text-text placeholder-text2 focus:outline-none focus:border-accent resize-none"
          />
          <p className="text-xs text-text2">
            {idealDesc.length}/1000 characters
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save Mode"}
        </button>
        {saved && <span className="text-sm text-green">Saved!</span>}
      </div>
    </section>
  );
}
