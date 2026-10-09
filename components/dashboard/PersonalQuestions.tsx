"use client";

/**
 * History → "Only you can answer": the questions about the person's own circumstances
 * that hold up waiting applications, one row per question however many jobs ask it
 * (GET /personal-questions, the same list as the extension popup).
 *
 * One answer here is remembered (POST /profile/facts) and goes onto every application
 * that asked it; the ones it completes go back in the queue. A question about one job
 * ("Why this company?") never shows up here: it stays on its own hand-back row below.
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { describeFailure } from "@/lib/apiFailure";
import { listPersonalQuestions, saveFact, MAX_ANSWER, type PersonalQuestion } from "@/lib/facts";

async function token(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session?.access_token) throw Object.assign(new Error("expired"), { status: 401 });
  return session.access_token;
}

export default function PersonalQuestions({
  onAnswered,
  initialQuestions,
}: {
  /** The hand-back rows below changed (some went back in the queue). */
  onAnswered: () => void;
  /** Lets a preview page render the list without a session. */
  initialQuestions?: PersonalQuestion[];
}) {
  const [questions, setQuestions] = useState<PersonalQuestion[]>(initialQuestions ?? []);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (initialQuestions) return;
    try {
      const r = await listPersonalQuestions(await token());
      setQuestions(r.questions);
    } catch {
      /* optional panel: every question is still answerable on its hand-back row below */
    }
  }, [initialQuestions]);

  useEffect(() => {
    // Deferred a frame: the effect body itself must not set state (React compiler rule).
    const raf = requestAnimationFrame(() => { void load(); });
    return () => cancelAnimationFrame(raf);
  }, [load]);

  if (questions.length === 0) return notice ? <p className="text-sm text-green" role="status">{notice}</p> : null;

  return (
    <div data-testid="personal-questions">
      <div className="hd-hist-day">
        <h2 className="hd-eyebrow hd-eyebrow-ink">Only you can answer</h2>
        <span className="hd-eyebrow tabular-nums order-last">
          {questions.length} question{questions.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="hd-sheet divide-y divide-border overflow-hidden">
        {questions.map((q) => (
          <QuestionRow
            key={q.question}
            q={q}
            onSaved={(requeued) => {
              setNotice(
                requeued > 0
                  ? `Saved. ${requeued} application${requeued === 1 ? " is" : "s are"} back in the queue.`
                  : "Saved. We'll use it whenever an employer asks.",
              );
              setQuestions((all) => all.filter((x) => x.question !== q.question));
              onAnswered();
              void load();
            }}
          />
        ))}
      </div>
      {notice && <p className="mt-2 text-sm text-green" role="status">{notice}</p>}
    </div>
  );
}

function QuestionRow({ q, onSaved }: { q: PersonalQuestion; onSaved: (requeued: number) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = q.jobs.length;

  async function save(answer: string) {
    const a = answer.trim();
    if (!a || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await saveFact(await token(), { question: q.question, answer: a, source: "history" });
      onSaved(res.requeued);
    } catch (e) {
      setError(describeFailure(e).message);
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-3.5 space-y-2" data-testid="personal-question">
      <div>
        <p className="hd-hist-title break-words">{q.question}</p>
        <p className="hd-eyebrow mt-1">
          {q.topic_label} · waiting on {n} application{n === 1 ? "" : "s"}
        </p>
      </div>
      {q.related.length > 0 && (
        <p className="text-[12.5px] text-text2 break-words">
          You said before: {q.related.map((f) => `${f.question}: ${f.answer}`).join(" · ")}
        </p>
      )}
      {q.options.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {q.options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => save(o)}
              disabled={busy}
              className="px-2.5 py-1 rounded-lg border border-border bg-surface text-[12.5px] text-text2
                transition hover:text-text hover:border-accent/50 disabled:opacity-50"
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <form method="post" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); save(value); }}>
          <input
            value={value}
            maxLength={MAX_ANSWER}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Your answer"
            aria-label={q.question}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px]
              text-text placeholder:text-text2/60 focus:outline-none focus:border-accent/60 transition"
          />
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white
              transition active:scale-[.97] disabled:opacity-45"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      )}
      {error && <p className="text-[12px] text-red" role="alert">{error}</p>}
    </div>
  );
}
