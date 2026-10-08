"use client";

import { useEffect, useRef, useState } from "react";

import { apiGet, apiPost, ApiError } from "@/lib/api";
import { answersUi, optedOut, optOutAnchors, type AnswerFlags, type AnswerValues } from "@/lib/employerAnswers";
import {
  blankRows,
  canConfirm,
  editableRows,
  isInfo,
  reviewBody,
  reviewValues,
  stillBlank,
  type ReviewSection,
} from "@/lib/reviewSheet";
import { createClient } from "@/lib/supabase/client";

type ReviewResponse = { sections: ReviewSection[] } & Record<string, unknown>;

// A hung read must end on a screen that offers a way on, not on "Loading…" forever.
const LOAD_TIMEOUT_MS = 15000;

async function token(): Promise<string> {
  const { data } = await createClient().auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error("Your session expired — sign in again.");
  return t;
}

// Once, before the first run (Igor, 10-07): every value the forms get from the profile,
// on one page, and one "Everything's correct". The rows are the server's
// (GET /profile/review); the Start gate asks for this until the person confirms it once.
export default function ReviewSheet({ onDone }: { onDone: () => void }) {
  const [sections, setSections] = useState<ReviewSection[] | null>(null);
  const [values, setValues] = useState<AnswerValues>({});
  const [flags, setFlags] = useState<AnswerFlags>({});
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Rows the server still found blank on the last save — outlined until they are filled.
  const [flagged, setFlagged] = useState<string[]>([]);
  // A close (✕) during a save: the answer belongs to a sheet that is gone.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await Promise.race([
          apiGet<ReviewResponse>("/profile/review", await token()),
          new Promise<never>((_resolve, reject) =>
            setTimeout(() => reject(new Error("the server took too long to answer")), LOAD_TIMEOUT_MS),
          ),
        ]);
        const got = Array.isArray(res.sections) ? res.sections : [];
        // Whichever opt-outs the rows carry — no flag is named here.
        const optFlags: AnswerFlags = Object.fromEntries(
          editableRows(got).flatMap((q) => (q.opt_out ? [[q.opt_out.flag, res[q.opt_out.flag] === true]] : [])),
        );
        if (!live) return;
        setFlags(optFlags);
        setValues(reviewValues(got));
        setSections(got);
      } catch (e) {
        if (live) setLoadErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [attempt]);

  if (loadErr) {
    return (
      <div className="rounded-xl border border-border bg-surface2/40 p-4" data-testid="review-sheet">
        <p className="text-[13px] text-red" data-testid="review-load-error">
          Couldn&apos;t load your details ({loadErr}).
        </p>
        <button
          type="button"
          onClick={() => {
            setLoadErr(null);
            setAttempt((n) => n + 1);
          }}
          className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent2 transition"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!sections) {
    return (
      <div className="rounded-xl border border-border bg-surface2/40 p-4" data-testid="review-sheet">
        <p className="text-[13px] text-text2" data-testid="review-loading">Loading your details…</p>
      </div>
    );
  }

  const rows = editableRows(sections);
  const anchors = optOutAnchors(rows);
  const blank = new Set(blankRows(sections, values, flags));
  const ready = canConfirm(sections, values, flags);
  const abroad = rows.some((q) => q.kind === "us_resident" && values[q.key] === false);
  const set = (k: string, v: string | boolean) => setValues((s) => ({ ...s, [k]: v }));

  async function confirm() {
    if (!ready || saving || !sections) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await apiPost<{ confirmed?: boolean }>(
        answersUi("/profile/review"),
        await token(),
        reviewBody(sections, values, flags),
      );
      if (!mounted.current) return;
      if (res?.confirmed) return onDone();
      setFlagged(stillBlank(res));
      setErr("A few details are still empty — fill in the outlined ones.");
    } catch (e) {
      if (!mounted.current) return;
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e));
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  const field =
    "w-full rounded-lg border bg-surface px-3 py-2 text-[13px] text-text placeholder:text-text2/40 " +
    "focus:outline-none focus:border-accent transition disabled:opacity-50";
  const yesNo = (on: boolean) =>
    "flex-1 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition " +
    (on ? "border-accent bg-accent text-white" : "border-border bg-surface text-text hover:border-accent/60");

  return (
    <div className="rounded-xl border border-border bg-surface2/40 p-4" data-testid="review-sheet">
      <p className="text-[13px] font-semibold text-text">Check what we&apos;ll tell employers</p>
      <p className="mt-0.5 text-xs text-text2/70">
        Once, before your first run. This goes on every application — fix anything that&apos;s off.
      </p>

      <div className="mt-4 space-y-5">
        {sections.map((section) => (
          <section key={section.title}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text2/60">{section.title}</p>
            <div className="space-y-3">
              {section.rows.map((row) => {
                if (isInfo(row)) {
                  return (
                    <div key={row.key} data-testid={`review-${row.key}`}>
                      <span className="mb-0.5 block text-xs font-medium text-text2">{row.label}</span>
                      <span className="block text-[13px] text-text">{String(row.value || "—")}</span>
                    </div>
                  );
                }
                const q = rows.find((x) => x.key === row.key)!;
                const outlined = flagged.includes(q.key) && blank.has(q.key);
                return (
                  <div key={q.key} data-testid={`review-${q.key}`}>
                    <span className="mb-1 block text-xs font-medium text-text2">
                      {q.label}
                      {row.required === false && <span className="text-text2/50"> · optional</span>}
                    </span>
                    {q.kind !== "text" ? (
                      <div className="flex gap-2">
                        {[true, false].map((v) => (
                          <button
                            key={String(v)}
                            type="button"
                            onClick={() => set(q.key, v)}
                            aria-pressed={values[q.key] === v}
                            className={yesNo(values[q.key] === v)}
                          >
                            {v ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        className={field + (outlined ? " border-red" : " border-border")}
                        value={typeof values[q.key] === "string" ? (values[q.key] as string) : ""}
                        onChange={(e) => set(q.key, e.target.value)}
                        disabled={optedOut(q, flags)}
                        autoComplete="off"
                      />
                    )}
                    {anchors[q.key] && (
                      <label className="mt-1.5 flex items-center gap-2 text-xs text-text2/80">
                        <input
                          type="checkbox"
                          data-testid={`review-optout-${anchors[q.key].flag}`}
                          checked={flags[anchors[q.key].flag] === true}
                          onChange={(e) => setFlags((s) => ({ ...s, [anchors[q.key].flag]: e.target.checked }))}
                        />
                        {anchors[q.key].label}
                      </label>
                    )}
                    {q.note && <p className="mt-1 text-xs text-red">{q.note}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {abroad && (
        <p className="mt-4 rounded-lg border border-yellow/30 bg-yellow/10 px-3 py-2 text-xs text-text" data-testid="us-only">
          HireDrop applies to jobs in the United States only — it can&apos;t run from abroad yet.
        </p>
      )}
      {err && (
        <p className="mt-3 text-xs text-red" data-testid="review-error">
          {err}
        </p>
      )}
      <button
        type="button"
        onClick={confirm}
        disabled={!ready || saving}
        data-testid="btn-review-confirm"
        className="mt-4 w-full rounded-lg bg-accent px-3 py-2 text-[13px] font-semibold text-white transition
          hover:bg-accent2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : "Everything's correct"}
      </button>
    </div>
  );
}
