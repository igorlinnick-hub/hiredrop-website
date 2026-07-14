"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// submit_mode is orthogonal to apply_mode (broad/standard/precise = fit threshold).
// "auto" = HireDrop fills + submits for you (default, capped for cost/ban-safety).
// "tap"  = you approve each application before it's sent → you keep control, solve any
//          captcha, and we can apply to far more per day (see PLAN §3: human review lets
//          us use a cheaper model, so the higher cap stays profitable).
type SubmitMode = "auto" | "tap";

const OPTIONS: { id: SubmitMode; label: string; tagline: string; detail: string; cap: string }[] = [
  {
    id: "auto",
    label: "Auto",
    tagline: "Set it and forget it",
    detail: "HireDrop fills and submits applications for you, up to your daily limit. The default.",
    cap: "Up to 30/day",
  },
  {
    id: "tap",
    label: "Tap",
    tagline: "Review each, apply to more",
    detail: "You approve every application in one tap before it's sent — keep control, solve any captcha yourself, and apply to far more per day. Best for keeping your accounts safe.",
    cap: "Up to 100/day",
  },
];

export default function SubmitModePanel() {
  const supabase = createClient();
  const [mode, setMode] = useState<SubmitMode>("auto");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("submit_mode")
        .eq("user_id", user.id)
        .single();
      if (data?.submit_mode === "tap") setMode("tap");
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(
    async (next: SubmitMode) => {
      const prev = mode;
      setMode(next);
      setSaving(true);
      setSaved(false);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      const { error: saveError } = await supabase
        .from("profiles")
        .update({ submit_mode: next })
        .eq("user_id", user.id);
      setSaving(false);
      if (saveError) {
        setMode(prev); // revert on failure
        setError("Couldn't save. Please try again.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    [supabase, mode]
  );

  if (loading) return null;

  return (
    <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-text">Apply mode</h3>
        <p className="text-sm text-text2 mt-1">How your applications get submitted.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((o) => {
          const active = mode === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => !active && save(o.id)}
              disabled={saving}
              className={[
                "text-left p-4 rounded-lg border-2 transition",
                active ? "border-accent bg-accent/5" : "border-border hover:border-text2",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-text">{o.label}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green/10 text-green whitespace-nowrap">
                  {o.cap}
                </span>
              </div>
              <span className="text-xs text-accent block mt-0.5">{o.tagline}</span>
              <span className="text-xs text-text2 block mt-1">{o.detail}</span>
            </button>
          );
        })}
      </div>
      {saved && <p className="text-sm text-green">Saved ✓</p>}
      {error && <p className="text-sm text-red">{error}</p>}
    </section>
  );
}
