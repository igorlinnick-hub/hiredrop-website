// The rules of the employer-answers form, without React — so they can be tested with
// `node --test`. The LIST of questions is the server's (modules/employer_answers.py);
// nothing here knows which questions exist, only how one is answered.

export type AnswerKind = "text" | "yesno" | "us_resident";

export interface AnswerQuestion {
  key: string;
  label: string;
  kind: AnswerKind;
  // The answer already on file (signup shows every question, answered or not).
  value?: string | boolean | null;
  // What the user's own resume says. Offered for them to confirm, never saved for them.
  suggestion?: string;
  // "I don't have one" — a tickbox that answers this question (and its siblings).
  opt_out?: { flag: string; label: string };
}

export type AnswerValues = Record<string, string | boolean>;
export type AnswerFlags = Record<string, boolean>;

/** What each control starts with: the answer on file, else the resume's suggestion. */
export function initialValues(questions: AnswerQuestion[]): AnswerValues {
  const out: AnswerValues = {};
  for (const q of questions) {
    if (q.kind === "text") {
      const v = (typeof q.value === "string" && q.value.trim()) || q.suggestion || "";
      if (v) out[q.key] = v;
    } else if (typeof q.value === "boolean") {
      out[q.key] = q.value;
    }
  }
  return out;
}

export function optedOut(q: AnswerQuestion, flags: AnswerFlags): boolean {
  return !!q.opt_out && flags[q.opt_out.flag] === true;
}

export function isAnswered(q: AnswerQuestion, values: AnswerValues, flags: AnswerFlags): boolean {
  if (optedOut(q, flags)) return true;
  const v = values[q.key];
  return q.kind === "text" ? typeof v === "string" && v.trim() !== "" : typeof v === "boolean";
}

/** A text question still waiting for something to put in it: no answer on file, nothing
 *  offered yet, and not waved away by its tickbox. These are what the resume is read for. */
export function awaitsHint(q: AnswerQuestion, flags: AnswerFlags): boolean {
  return q.kind === "text" && !q.value && !q.suggestion && !optedOut(q, flags);
}

/** Put what the resume says into the boxes that are still EMPTY. A hint arrives a moment
 *  after the form is on screen, so it must never replace what someone has begun typing. */
export function applyHints(
  values: AnswerValues,
  questions: AnswerQuestion[],
  flags: AnswerFlags,
  hints: Record<string, string>,
): AnswerValues {
  const next = { ...values };
  for (const q of questions) {
    const hint = (hints[q.key] || "").trim();
    const typed = next[q.key];
    if (hint && awaitsHint(q, flags) && !(typeof typed === "string" && typed.trim())) next[q.key] = hint;
  }
  return next;
}

/** HireDrop applies to US jobs only — a No is a closed door, not an answer to save. */
export function livesAbroad(questions: AnswerQuestion[], values: AnswerValues): boolean {
  return questions.some((q) => q.kind === "us_resident" && values[q.key] === false);
}

/** The tickboxes to draw, each under the FIRST asked question it answers. */
export function optOutAnchors(questions: AnswerQuestion[]): Record<string, { flag: string; label: string }> {
  const seen = new Set<string>();
  const out: Record<string, { flag: string; label: string }> = {};
  for (const q of questions) {
    if (!q.opt_out || seen.has(q.opt_out.flag)) continue;
    seen.add(q.opt_out.flag);
    out[q.key] = q.opt_out;
  }
  return out;
}

/** Signup lays the form out in two columns. A yes/no takes the whole row, and so does a
 *  question that owns its tickbox alone (LinkedIn, pay) — while a pair sharing one
 *  (school + degree) sits side by side with the tickbox under it. */
export function spansRow(q: AnswerQuestion, questions: AnswerQuestion[]): boolean {
  if (q.kind !== "text") return true;
  if (!q.opt_out) return false;
  return questions.filter((x) => x.opt_out?.flag === q.opt_out!.flag).length === 1;
}

/** The POST body: every asked question's answer, and every asked flag as a real
 *  boolean — unticking "no degree" has to reach the server as false, not as silence. */
export function buildBody(
  questions: AnswerQuestion[],
  values: AnswerValues,
  flags: AnswerFlags,
): Record<string, string | boolean> {
  const body: Record<string, string | boolean> = {};
  for (const q of questions) {
    if (q.opt_out) body[q.opt_out.flag] = flags[q.opt_out.flag] === true;
    if (optedOut(q, flags)) continue;
    const v = values[q.key];
    if (v !== undefined) body[q.key] = typeof v === "string" ? v.trim() : v;
  }
  return body;
}
