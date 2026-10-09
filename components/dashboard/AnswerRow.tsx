"use client";

/**
 * One line of History → "What we answered for you", with a way to correct it.
 *
 * The walk answers the small logistics questions in the person's favour instead of
 * stopping to ask (relocate, on-site, weekends: Yes). This row is where they correct us:
 * "Change" saves their answer as a fact (POST /profile/facts), and every later form that
 * asks the same question gets it from there, before any default or model. This
 * application is already sent; the correction is for the next ones.
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { describeFailure } from "@/lib/apiFailure";
import { saveFact, MAX_ANSWER, MAX_QUESTION } from "@/lib/facts";

async function token(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session?.access_token) throw Object.assign(new Error("expired"), { status: 401 });
  return session.access_token;
}

export default function AnswerRow({
  q,
  a,
  onChanged,
}: {
  q: string;
  a: string;
  onChanged: (answer: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(a);
  const [options, setOptions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function open() {
    setValue(a);
    setOptions([]);
    setError(null);
    setSaved(false);
    setEditing(true);
  }

  async function save(answer: string) {
    const next = answer.trim();
    if (!next || busy) return;
    setBusy(true);
    setError(null);
    try {
      await saveFact(await token(), { question: q.slice(0, MAX_QUESTION), answer: next, source: "history" });
      onChanged(next);
      setEditing(false);
      setSaved(true);
    } catch (e) {
      const f = describeFailure(e);
      setError(f.message);
      setOptions(f.options ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-2" data-testid="history-answer">
      <dt className="hd-hist-sub text-[12px] leading-snug">{q}</dt>
      {!editing ? (
        <dd className="mt-0.5 flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-medium leading-snug text-text break-words">{a}</span>
          <button
            type="button"
            onClick={open}
            className="shrink-0 text-[12px] text-text2 underline-offset-2 transition hover:text-text hover:underline"
          >
            Change
          </button>
        </dd>
      ) : (
        <dd className="mt-1.5 space-y-2">
          <form method="post" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); save(value); }}>
            <input
              value={value}
              maxLength={MAX_ANSWER}
              onChange={(e) => setValue(e.target.value)}
              aria-label={q}
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px]
                text-text placeholder:text-text2/60 focus:outline-none focus:border-accent/60 transition"
            />
            <button
              type="submit"
              disabled={busy || !value.trim() || value.trim() === a}
              className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white
                transition active:scale-[.97] disabled:opacity-45"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="shrink-0 px-1 text-[12.5px] text-text2 transition hover:text-text"
            >
              Cancel
            </button>
          </form>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {options.map((o) => (
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
          )}
          {error && <p className="text-[12px] text-red" role="alert">{error}</p>}
        </dd>
      )}
      {saved && (
        <p className="mt-1 text-[12px] text-green" role="status">
          Saved. We will answer this way on your next applications.
        </p>
      )}
    </div>
  );
}
