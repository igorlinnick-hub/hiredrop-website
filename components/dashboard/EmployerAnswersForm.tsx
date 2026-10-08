"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/components/ui/Button";
import { apiPost, ApiError } from "@/lib/api";
import {
  answersUi,
  applyHints,
  askNow,
  awaitingConfirmation,
  awaitsHint,
  buildBody,
  initialValues,
  isAnswered,
  livesAbroad,
  normalizeQuestions,
  optedOut,
  optOutAnchors,
  resumeGroup,
  spansRow,
  type AnswerFlags,
  type AnswerQuestion,
  type AnswerValues,
} from "@/lib/employerAnswers";
import { currentResumeHints } from "@/lib/employerAnswersHints";
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
// What the resume said (`from_resume` on the suggest answer) is drawn as its own group
// and counts only once the person confirms it — "Looks right", or touching the box.
export default function EmployerAnswersForm({
  questions,
  flags: initialFlags,
  onDone,
  onBack,
  onSkip,
  preview,
  withoutResume,
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
  // Signup with no resume yet: the questions a resume answers are asked after one is
  // uploaded (the Start gate still requires them), so the save's `missing` list is
  // trimmed the same way the step trimmed the first one.
  withoutResume?: boolean;
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
  // The questions the resume answered (stable once the hints land) and which of them the
  // person has confirmed.
  const [group, setGroup] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  // Blank text questions: ask the resume, in signup and at the Start gate alike — an
  // account older than a question deserves the same "check it" instead of an empty box.
  // One the server already offered a suggestion for is asked too: only the suggest answer
  // says which suggestions are the resume's own.
  const [reading, setReading] = useState(
    () =>
      !preview &&
      questions.some((q) => q.kind === "text" && !q.value && !optedOut(q, initialFlags || {})),
  );
  useEffect(() => {
    if (!reading) return;
    let live = true;
    (async () => {
      // A read that never answers must not hold Save shut: after 15s (the slowest read
      // measured was 11s) the form opens without resume hints, as if there were none.
      const hints = await Promise.race([
        currentResumeHints(),
        new Promise<{ suggestions: Record<string, string>; fromResume: null }>((r) =>
          setTimeout(() => r({ suggestions: {}, fromResume: null }), 15000),
        ),
      ]);
      if (!live) return;
      const f = initialFlags || {};
      setValues((s) => applyHints(s, questions, f, hints.suggestions));
      const opened = normalizeQuestions(questions);
      setGroup(
        resumeGroup(opened, hints.fromResume, applyHints(initialValues(opened), opened, f, hints.suggestions)),
      );
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

  // Touching a box is confirming it: what is in it is now the person's own answer.
  const set = (k: string, v: string | boolean) => {
    setValues((s) => ({ ...s, [k]: v }));
    setConfirmed((s) => ({ ...s, [k]: true }));
  };
  const fromResume = asked.filter((q) => group.includes(q.key));
  const unconfirmed = awaitingConfirmation(fromResume.map((q) => q.key), confirmed, asked, flags);
  // Not while the resume is still being read: until it answers, nobody knows which
  // pre-filled values are the resume's and still need the person's "Looks right".
  const complete =
    !abroad && !reading && unconfirmed.length === 0 && asked.every((q) => isAnswered(q, values, flags));

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
      const left = askNow(normalizeQuestions(res?.missing || []), !withoutResume);
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

  // One run of questions, laid out for the home it is in. `of` is the row's neighbours —
  // a pair sharing a tickbox sits side by side only when both are in the same run.
  const grid = (of: AnswerQuestion[]) => (
    <div className={inStep ? "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5" : "space-y-3"}>
      {of.map((q) => (
        <div
          key={q.key}
          data-testid={`answer-${q.key}`}
          className={inStep && spansRow(q, of) ? "sm:col-span-2" : undefined}
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
          {q.note && (
            <p className="mt-1.5 rounded-md border border-yellow/30 bg-yellow/10 px-2 py-1 text-xs text-text"
              data-testid={`note-${q.key}`}>
              {q.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );

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

      {fromResume.length > 0 ? (
        <>
          <div
            className={
              "rounded-xl border border-accent/30 bg-accent-light/50 " + (inStep ? "p-4" : "p-3")
            }
            data-testid="answers-from-resume"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className={inStep ? "text-sm font-semibold text-text" : "text-[13px] font-semibold text-text"}>
                From your resume — check these
              </p>
              {unconfirmed.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmed((s) => ({ ...s, ...Object.fromEntries(unconfirmed.map((k) => [k, true])) }))
                  }
                  data-testid="btn-resume-looks-right"
                  className="shrink-0 rounded-lg border border-accent bg-surface px-3 py-1.5 text-xs font-semibold
                    text-accent hover:bg-accent hover:text-white transition"
                >
                  Looks right
                </button>
              ) : (
                <span className="shrink-0 text-xs font-medium text-green">✓ Confirmed</span>
              )}
            </div>
            {grid(fromResume)}
          </div>
          {asked.length > fromResume.length && (
            <>
              <p className={inStep ? "mt-6 mb-3 text-sm font-semibold text-text" : "mt-4 mb-2 text-[13px] font-semibold text-text"}>
                A few more
              </p>
              {grid(asked.filter((q) => !group.includes(q.key)))}
            </>
          )}
        </>
      ) : (
        grid(asked)
      )}

      {abroad && (
        <p className="mt-3 rounded-lg border border-yellow/30 bg-yellow/10 px-3 py-2 text-xs text-text" data-testid="us-only">
          HireDrop applies to jobs in the United States only — it can&apos;t run from abroad yet.
        </p>
      )}
      {!abroad && unconfirmed.length > 0 && asked.every((q) => isAnswered(q, values, flags)) && (
        <p className="mt-3 text-xs text-text2" data-testid="answers-confirm-hint">
          Check what we took from your resume, then press Looks right.
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
