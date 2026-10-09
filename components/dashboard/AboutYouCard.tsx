"use client";

/**
 * Settings → "About you": the answers about the person's own circumstances that we keep
 * for every application ("Relocation plans: Moving to San Diego in December").
 *
 * The list is the same one the extension popup, History and Drop's cards write to
 * (POST /profile/facts), so editing it here changes what every form gets. Saving one
 * also fills it into applications already waiting on that question.
 */

import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { describeFailure } from "@/lib/apiFailure";
import {
  deleteFact, listFacts, saveFact, MAX_ANSWER, MAX_QUESTION, type PersonalFact,
} from "@/lib/facts";

type Draft = { id: string | null; question: string; answer: string; in_letters: boolean };
const EMPTY: Draft = { id: null, question: "", answer: "", in_letters: false };

async function token(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session?.access_token) throw Object.assign(new Error("expired"), { status: 401 });
  return session.access_token;
}

/** `initialFacts` lets a preview page render the card without a session. */
export default function AboutYouCard({ initialFacts }: { initialFacts?: PersonalFact[] }) {
  const [facts, setFacts] = useState<PersonalFact[] | null>(initialFacts ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialFacts) return;
    let alive = true;
    token()
      .then(listFacts)
      .then((r) => { if (alive) setFacts(r.facts); })
      .catch((e) => { if (alive) setLoadError(describeFailure(e).message); });
    return () => { alive = false; };
  }, [initialFacts]);

  function open(d: Draft) {
    setDraft(d);
    setError(null);
    setOptions(null);
    setNotice(null);
  }

  async function save(answer?: string) {
    if (!draft || busy) return;
    const question = draft.question.trim();
    const value = (answer ?? draft.answer).trim();
    if (!question || !value) return;
    setBusy(true);
    setError(null);
    setOptions(null);
    try {
      const res = await saveFact(await token(), {
        question,
        answer: value,
        in_letters: draft.in_letters,
        replace_ids: draft.id ? [draft.id] : [],
        source: "settings",
      });
      setFacts(res.facts);
      setDraft(null);
      setNotice(
        res.requeued > 0
          ? `Saved. ${res.requeued} waiting application${res.requeued === 1 ? " is" : "s are"} back in the queue.`
          : "Saved. We'll use it on every application.",
      );
    } catch (e) {
      const why = describeFailure(e);
      setError(why.message);
      setOptions(why.options ?? null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(f: PersonalFact) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await deleteFact(await token(), f.id);
      setFacts(res.facts);
      if (draft?.id === f.id) setDraft(null);
    } catch (e) {
      setError(describeFailure(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hd-sheet p-5 sm:p-6 space-y-4" id="about-you" data-testid="about-you">
      <div className="flex items-center justify-between gap-3">
        <h3 className="hd-hist-sub-head">About you</h3>
        {facts && !draft && (
          <Button variant="secondary" size="sm" onClick={() => open(EMPTY)} data-testid="about-you-add">
            Add
          </Button>
        )}
      </div>

      {facts === null && !loadError && <div className="h-12 rounded-lg bg-surface2/60 animate-pulse" aria-busy="true" />}
      {loadError && <p className="text-sm text-red">{loadError}</p>}

      {facts && facts.length === 0 && !draft && (
        <p className="text-sm text-text2">
          Things an employer may ask that only you can answer, like relocation plans or when you can start.
          Add one here, or answer a waiting question and we keep it for next time.
        </p>
      )}

      {facts && facts.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {facts.map((f) =>
            draft?.id === f.id ? null : (
              <li key={f.id} className="flex items-start gap-3 px-3.5 py-3" data-testid="about-you-row">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text break-words">{f.question}</p>
                  <p className="text-sm text-text2 break-words mt-0.5">{f.answer}</p>
                  {f.in_letters && (
                    <span className="mt-1.5 inline-block rounded-full border border-border px-2 py-0.5 text-[11px] text-text2">
                      In cover letters
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => open({ id: f.id, question: f.question, answer: f.answer, in_letters: f.in_letters })}
                    disabled={busy}
                    className="rounded-md px-2 py-1 text-[12.5px] text-text2 transition hover:text-text hover:bg-surface2 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(f)}
                    disabled={busy}
                    className="rounded-md px-2 py-1 text-[12.5px] text-text2 transition hover:text-red hover:bg-surface2 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {draft && (
        <form
          method="post"
          className="space-y-3 rounded-lg border border-accent/30 bg-surface2/40 p-3.5"
          onSubmit={(e) => { e.preventDefault(); save(); }}
          data-testid="about-you-form"
        >
          <Input
            id="about-you-question"
            label="What it's about"
            value={draft.question}
            maxLength={MAX_QUESTION}
            placeholder="Relocation plans"
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
          />
          <Textarea
            id="about-you-answer"
            label="Your answer"
            rows={2}
            value={draft.answer}
            maxLength={MAX_ANSWER}
            placeholder="Moving to San Diego in December"
            onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={draft.in_letters}
              onChange={(e) => setDraft({ ...draft, in_letters: e.target.checked })}
              className="rounded border-border accent-accent"
            />
            Mention in cover letters
          </label>
          {error && <p className="text-sm text-red" role="alert">{error}</p>}
          {options && (
            <div className="flex flex-wrap gap-1.5">
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => save(o)}
                  disabled={busy}
                  className="px-2.5 py-1 rounded-lg border border-border bg-surface text-[12.5px] text-text2
                    transition hover:text-text hover:border-accent/50"
                >
                  {o}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy || !draft.question.trim() || !draft.answer.trim()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}

      {error && !draft && <p className="text-sm text-red" role="alert">{error}</p>}
      {notice && <p className="text-sm text-green" role="status">{notice}</p>}
    </div>
  );
}
