"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/components/ui/Button";
import { apiPost, ApiError } from "@/lib/api";
import {
  answersUi,
  applyHints,
  awaitsHint,
  buildBody,
  initialValues,
  isAnswered,
  livesAbroad,
  normalizeQuestions,
  optedOut,
  optOutAnchors,
  spansRow,
  type AnswerFlags,
  type AnswerQuestion,
  type AnswerValues,
} from "@/lib/employerAnswers";
import { resumeHints } from "@/lib/employerAnswersHints";
import { createClient } from "@/lib/supabase/client";

// One question from the server's list (modules/employer_answers.py on the backend is the
// only list — this form draws whatever it is handed, so signup, the Start gate and the
// Start refusal can never disagree about which questions count).
export type MissingAnswer = AnswerQuestion;

const PLACEHOLDER: Record<string, string> = {
  city: "e.g. Austin",
  state: "e.g. TX",
  current_title: "e.g. Marketing Manager",
  current_employer: "e.g. Acme Inc.",
  linkedin_url: "linkedin.com/in/you",
  school: "e.g. University of Texas at Austin",
  degree: "e.g. BA Communications",
  salary_expectation: "e.g. $85,000 per year",
};

// "Once, and never again": every question employers keep asking, answered in one sheet.
// Two homes, one form — signup (`onBack` given: every question, pre-filled from the
// resume, Back/Continue) and the Start gate (only what is still missing, as a card).
// Saving returns the server's fresh `missing` list, so the sheet redraws until it is
// empty. US only: "No" to living in the US ends it right here.
export default function EmployerAnswersForm({
  questions,
  flags: initialFlags,
  onDone,
  onBack,
  onSkip,
  preview,
}: {
  questions: AnswerQuestion[];
  flags?: AnswerFlags;
  // Called after a successful save, with what was saved.
  onDone: (saved?: Record<string, string | boolean>) => void;
  onBack?: () => void;
  // /preview only: draw everything, touch nothing — no resume read, no save. The page
  // is public and the visitor may well be signed in; a click there must not write mock
  // answers into a real profile.
  preview?: boolean;
  // Signup only: the way past a save that keeps failing. The Start gate asks again, so
  // an outage on our side must not be what stops someone finishing their account.
  onSkip?: () => void;
}) {
  const [asked, setAsked] = useState<AnswerQuestion[]>(() => normalizeQuestions(questions));
  const [values, setValues] = useState<AnswerValues>(() => initialValues(questions));
  // Back (or the modal's ✕) during a save: the answer that comes back belongs to a form
  // that is gone, and must not walk the wizard forward from wherever the user now is.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [flags, setFlags] = useState<AnswerFlags>(initialFlags || {});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Blank text questions: ask the resume, in signup and at the Start gate alike — an
  // account older than a question deserves the same "check it" instead of an empty box.
  const [reading, setReading] = useState(
    () => !preview && questions.some((q) => awaitsHint(q, initialFlags || {})),
  );
  useEffect(() => {
    if (!reading) return;
    let live = true;
    (async () => {
      let hints: Record<string, string> = {};
      try {
        const { data } = await createClient().auth.getSession();
        const session = data.session;
        if (session?.access_token) hints = await resumeHints(session.access_token, session.user.id);
      } catch { /* no session, no hints — the boxes stay empty */ }
      if (!live) return;
      setValues((s) => applyHints(s, questions, initialFlags || {}, hints));
      setReading(false);
    })();
    return () => {
      live = false;
    };
    // Once, for the questions this form opened with.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const inStep = !!onBack;
  const abroad = livesAbroad(asked, values);
  const anchors = optOutAnchors(asked);

  const set = (k: string, v: string | boolean) => setValues((s) => ({ ...s, [k]: v }));
  const complete = !abroad && asked.every((q) => isAnswered(q, values, flags));

  async function save() {
    if (!complete || saving) return;
    if (preview) return onDone();
    setSaving(true);
    setErr(null);
    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired — sign in again.");
      const body = buildBody(asked, values, flags);
      const res = await apiPost<{ missing: AnswerQuestion[] }>(
        answersUi("/profile/employer-answers"),
        token,
        body,
      );
      if (!mounted.current) return;
      const left = normalizeQuestions(res?.missing || []);
      if (left.length === 0) return onDone(body);
      setAsked(left);
      setValues((s) => ({ ...initialValues(left), ...s }));
    } catch (e) {
      if (!mounted.current) return;
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e));
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  const field = inStep
    ? "w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-text " +
      "placeholder:text-text2/60 focus:outline-none focus:ring-2 focus:ring-accent/50 " +
      "focus:border-accent transition disabled:opacity-50"
    : "w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-text " +
      "placeholder:text-text2/40 focus:outline-none focus:border-accent transition disabled:opacity-50";
  const label = inStep
    ? "mb-1.5 block text-sm font-medium text-text"
    : "mb-1 block text-xs font-medium text-text2";
  const yesNo = (on: boolean) =>
    inStep
      ? "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition active:scale-[.98] " +
        (on
          ? "border-accent bg-accent-light text-accent"
          : "border-border bg-surface text-text2 hover:border-accent hover:text-text")
      : "flex-1 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition " +
        (on
          ? "border-accent bg-accent text-white"
          : "border-border bg-surface text-text hover:border-accent/60");

  return (
    <div
      className={inStep ? "" : "rounded-xl border border-border bg-surface2/40 p-4"}
      data-testid="employer-answers"
    >
      {!inStep && (
        <>
          <p className="text-[13px] font-semibold text-text">Answer these once</p>
          <p className="mt-0.5 mb-3 text-xs text-text2/70">
            Employers ask them on almost every application. Blank ones stop the form at the last step.
          </p>
        </>
      )}

      <div className={inStep ? "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5" : "space-y-3"}>
        {asked.map((q) => (
          <div
            key={q.key}
            data-testid={`answer-${q.key}`}
            className={inStep && spansRow(q, asked) ? "sm:col-span-2" : undefined}
          >
            <span className={label}>{q.label}</span>
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
              <>
                <input
                  className={field}
                  value={typeof values[q.key] === "string" ? (values[q.key] as string) : ""}
                  onChange={(e) => set(q.key, e.target.value)}
                  placeholder={reading && awaitsHint(q, flags) ? "Reading your resume…" : PLACEHOLDER[q.key]}
                  disabled={optedOut(q, flags)}
                  autoComplete="off"
                />
                {anchors[q.key] && (
                  <label className="mt-1.5 flex items-center gap-2 text-xs text-text2/80">
                    <input
                      type="checkbox"
                      data-testid={`optout-${anchors[q.key].flag}`}
                      checked={flags[anchors[q.key].flag] === true}
                      onChange={(e) =>
                        setFlags((s) => ({ ...s, [anchors[q.key].flag]: e.target.checked }))
                      }
                    />
                    {anchors[q.key].label}
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
      {err && (
        <p className="mt-3 text-xs text-red" data-testid="answers-error">
          {err}
          {onSkip && (
            <>
              {" "}
              <button type="button" onClick={onSkip} data-testid="btn-skip-answers"
                className="underline text-text2 hover:text-text">
                Skip for now — we&apos;ll ask again before your first Start
              </button>
            </>
          )}
        </p>
      )}
      {inStep ? (
        <div className="flex justify-between pt-6">
          <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
          <Button
            type="button"
            onClick={save}
            disabled={!complete || saving}
            data-testid="btn-save-answers"
            className="disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  );
}
