"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiPost } from "@/lib/api";
import type { HandbackQuestion } from "@/components/dashboard/useHandbacks";

/**
 * Answer the questions that stopped an application, and put it back in the queue.
 *
 * The filler's rule is "fill everything we can, hand back what only a human can
 * answer" — and it already knew exactly WHICH fields those were
 * (collectUnfilledRequired). What it did with that knowledge was send the user to the
 * job site to start the form again by hand, 99% of which we had already filled.
 *
 * Igor, 2026-09-21: "если нет инфы на вопрос то можно заполнить остальные 99% а этот
 * оставить на человека чтоб можно было одним кликом ему все завершить... кнопка
 * прогнать заявку и заявка переходит в тап очередь".
 *
 * So: the questions come here, the person answers them in the dashboard, and the job
 * goes back to `approved` — the status the queue is built from, which ext 1.8.6 runs at
 * the HEAD of the next run in both Auto and Tap. The answers are stored per-job and read
 * by the filler BEFORE any model call, so the retry fills straight through and cannot
 * answer differently the second time.
 *
 * Not a modal: the row it belongs to stays visible above it. A modal here would cover
 * the list the user is working through.
 */
export default function HandbackAnswers({
  handbackId,
  questions,
  onDone,
}: {
  handbackId: string;
  questions: HandbackQuestion[];
  /** Called after a successful save, with whether the job was actually re-queued. */
  onDone: (requeued: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const answered = questions.filter((q) => (values[q.label] || "").trim()).length;

  async function save() {
    if (busy || !answered) return;
    setBusy(true);
    setErr(null);
    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired — reload the page.");
      const res = await apiPost<{ ok: boolean; requeued: boolean }>(
        `/handbacks/${handbackId}/answers`,
        token,
        { answers: values },
      );
      onDone(!!res.requeued);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="mt-1.5 rounded-xl border border-accent/30 bg-surface2/40 p-3.5 space-y-3">
      <p className="text-[12.5px] text-text2 leading-snug">
        Everything else on this form is filled in. Answer these and it goes back in the
        queue — the next run starts with it.
      </p>

      {questions.map((q) => (
        <div key={q.label} className="space-y-1">
          <label className="block text-[13px] text-text leading-snug">{q.label}</label>
          {q.options.length > 0 ? (
            // A closed question keeps its own option list: typing free text into a
            // dropdown field is how a saved answer stops matching the form.
            <div className="flex flex-wrap gap-1.5">
              {q.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, [q.label]: o }))}
                  aria-pressed={values[q.label] === o}
                  className={[
                    "px-2.5 py-1 rounded-lg border text-[12.5px] transition active:scale-[.98]",
                    values[q.label] === o
                      ? "border-accent bg-accent-light text-accent font-medium"
                      : "border-border bg-surface text-text2 hover:text-text hover:border-accent/50",
                  ].join(" ")}
                >
                  {o}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              rows={2}
              value={values[q.label] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [q.label]: e.target.value }))}
              placeholder="Your answer"
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-[13px]
                text-text placeholder:text-text2/60 focus:outline-none focus:border-accent/60 transition"
            />
          )}
        </div>
      ))}

      {err && <p className="text-[12px] text-red">{err}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy || !answered}
          data-testid="handback-answer-save"
          className="rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white
            transition active:scale-[.97] disabled:opacity-45"
        >
          {busy ? "Queueing…" : "Answer and run it"}
        </button>
        {/* An honest count instead of a disabled button with no explanation. */}
        <span className="text-[11.5px] text-text2">
          {answered} of {questions.length} answered
        </span>
      </div>
    </div>
  );
}
