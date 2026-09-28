"use client";

import { useState } from "react";

import { apiPost, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

// One question the server says is still unanswered (modules/employer_answers.py on the
// backend is the only list — this form draws whatever it is handed, so the gate, the
// Start refusal and this screen can never disagree about which questions count).
export interface MissingAnswer {
  key: string;
  label: string;
  kind: "text" | "yesno" | "us_resident";
}

const PLACEHOLDER: Record<string, string> = {
  city: "e.g. Austin",
  state: "e.g. TX",
  current_title: "e.g. Marketing Manager",
  current_employer: "e.g. Acme Inc.",
  linkedin_url: "linkedin.com/in/you",
};

// "Once, and never again": every question employers keep asking, answered in one sheet
// before the first Start. Saving returns the server's fresh `missing` list, so the sheet
// simply redraws until it is empty. US only: "No" to living in the US ends it right here.
export default function EmployerAnswersForm({
  missing,
  onDone,
}: {
  missing: MissingAnswer[];
  onDone: () => void;
}) {
  const [asked, setAsked] = useState<MissingAnswer[]>(missing);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [noLinkedin, setNoLinkedin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // HireDrop applies to US jobs only — a No is a closed door, not an answer to save.
  const abroad = asked.some((q) => q.kind === "us_resident" && values[q.key] === false);

  const set = (k: string, v: string | boolean) => setValues((s) => ({ ...s, [k]: v }));
  const answered = (q: MissingAnswer) => {
    if (q.key === "linkedin_url" && noLinkedin) return true;
    const v = values[q.key];
    return q.kind === "text" ? typeof v === "string" && v.trim() !== "" : typeof v === "boolean";
  };
  const complete = !abroad && asked.every(answered);

  async function save() {
    if (!complete || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired — sign in again.");
      const body: Record<string, string | boolean> = {};
      for (const q of asked) {
        if (q.key === "linkedin_url" && noLinkedin) continue;
        body[q.key] = values[q.key];
      }
      if (noLinkedin) body.no_linkedin = true;
      const res = await apiPost<{ missing: MissingAnswer[] }>("/profile/employer-answers", token, body);
      const left = res?.missing || [];
      if (left.length === 0) return onDone();
      setAsked(left);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-text " +
    "placeholder:text-text2/40 focus:outline-none focus:border-accent transition";

  return (
    <div className="rounded-xl border border-border bg-surface2/40 p-4" data-testid="employer-answers">
      <p className="text-[13px] font-semibold text-text">Answer these once</p>
      <p className="mt-0.5 mb-3 text-xs text-text2/70">
        Employers ask them on almost every application. Blank ones stop the form at the last step.
      </p>

      <div className="space-y-3">
        {asked.map((q) => (
          <div key={q.key} data-testid={`answer-${q.key}`}>
            <span className="mb-1 block text-xs font-medium text-text2">{q.label}</span>
            {q.kind !== "text" ? (
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => set(q.key, v)}
                    aria-pressed={values[q.key] === v}
                    className={
                      "flex-1 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition " +
                      (values[q.key] === v
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-surface text-text hover:border-accent/60")
                    }
                  >
                    {v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <input
                  className={field}
                  value={typeof values[q.key] === "string" ? (values[q.key] as string) : ""}
                  onChange={(e) => set(q.key, e.target.value)}
                  placeholder={PLACEHOLDER[q.key]}
                  disabled={q.key === "linkedin_url" && noLinkedin}
                  autoComplete="off"
                />
                {q.key === "linkedin_url" && (
                  <label className="mt-1.5 flex items-center gap-2 text-xs text-text2/80">
                    <input
                      type="checkbox"
                      checked={noLinkedin}
                      onChange={(e) => setNoLinkedin(e.target.checked)}
                    />
                    I don&apos;t have a LinkedIn
                  </label>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {abroad && (
        <p className="mt-3 rounded-lg border border-yellow/30 bg-yellow/10 px-3 py-2 text-xs text-text" data-testid="us-only">
          HireDrop applies to jobs in the United States only — it can&apos;t run from abroad yet.
        </p>
      )}
      {err && <p className="mt-3 text-xs text-red">{err}</p>}
      <button
        type="button"
        onClick={save}
        disabled={!complete || saving}
        data-testid="btn-save-answers"
        className="mt-4 w-full rounded-lg bg-accent px-3 py-2 text-[13px] font-semibold text-white
          hover:bg-accent2 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Save answers"}
      </button>
    </div>
  );
}
