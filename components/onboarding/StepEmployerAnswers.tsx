"use client";

import { useEffect, useState } from "react";

import EmployerAnswersForm from "@/components/dashboard/EmployerAnswersForm";
import Button from "@/components/ui/Button";
import { apiGet } from "@/lib/api";
import type { AnswerFlags, AnswerQuestion } from "@/lib/employerAnswers";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";

// `questions` plus one boolean per "I don't have one" flag the questions carry.
type AnswersResponse = { questions: AnswerQuestion[] } & Record<string, unknown>;

// Every question employers keep asking, asked ONCE — here, at signup, right after the
// resume step, so the form arrives already filled in with what the resume says and the
// person only confirms. These used to surface as a wall on the first Start (and one of
// them, School, never surfaced at all: it stopped a real application on 2026-09-30).
//
// The list is the server's (GET /profile/employer-answers) — the same one the Start gate
// refuses on, which stays as the backstop for accounts older than a question.
// A hung request must end on the screen that offers a way on, not on "Loading…" forever.
const LOAD_TIMEOUT_MS = 15000;

export default function StepEmployerAnswers({
  profile,
  onNext,
  onBack,
  onSaved,
  preset,
}: {
  profile: UserProfile;
  onNext: () => void;
  onBack: () => void;
  // The answers were saved through the server; the wizard's own copy of two of them
  // (work eligibility, from a wizard that began before this step existed) is now stale.
  onSaved?: () => void;
  // Questions handed in instead of fetched — /preview/answers draws the real step
  // without a session, and without saving anything.
  preset?: AnswerQuestion[];
}) {
  const [questions, setQuestions] = useState<AnswerQuestion[] | null>(preset ?? null);
  const [flags, setFlags] = useState<AnswerFlags>({});
  const [err, setErr] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (preset) return;
    let live = true;
    (async () => {
      try {
        const { data } = await createClient().auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Your session expired — sign in again.");
        const res = await Promise.race([
          apiGet<AnswersResponse>("/profile/employer-answers", token),
          new Promise<never>((_resolve, reject) =>
            setTimeout(() => reject(new Error("the server took too long to answer")), LOAD_TIMEOUT_MS),
          ),
        ]);
        // Answers typed on an earlier step of a wizard that is already under way.
        const local: Record<string, boolean | null> = {
          work_authorized_us: profile.work_authorized_us,
          needs_sponsorship: profile.needs_sponsorship,
        };
        const rows = (res.questions || []).map((q) =>
          q.value === null && typeof local[q.key] === "boolean" ? { ...q, value: local[q.key] } : q,
        );
        // Whichever opt-outs the server's questions carry — no flag is named here. (What
        // the resume says for the blank ones is the form's own job: EmployerAnswersForm.)
        const optedOut: AnswerFlags = Object.fromEntries(
          rows.flatMap((q) => (q.opt_out ? [[q.opt_out.flag, res[q.opt_out.flag] === true]] : [])),
        );
        if (!live) return;
        setFlags(optedOut);
        setQuestions(rows);
      } catch (e) {
        if (live) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
    // The wizard's own answers are read once, when the step opens.
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">Answer these once</h2>
        <p className="text-sm text-text2 mt-1">
          Employers ask them on almost every application. We filled in what your resume says — check it.
        </p>
      </div>

      {err ? (
        <div className="space-y-4">
          <p className="p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm" data-testid="answers-load-error">
            Couldn&apos;t load the questions ({err}).
          </p>
          {/* Never a dead end: the Start gate asks the same questions, so signup can go
              on without them when our own API is the thing that is down. */}
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onNext} data-testid="btn-skip-answers">
                Skip for now
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setErr(null);
                  setAttempt((n) => n + 1);
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      ) : questions === null ? (
        <div className="space-y-4">
          <p className="text-sm text-text2" data-testid="answers-loading">Loading…</p>
          {/* Back stays reachable while we wait: a step with no buttons is a trap. */}
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
          </div>
        </div>
      ) : (
        <EmployerAnswersForm
          questions={questions}
          flags={flags}
          onDone={() => {
            onSaved?.();
            onNext();
          }}
          onBack={onBack}
          onSkip={onNext}
          preview={!!preset}
        />
      )}
    </div>
  );
}
