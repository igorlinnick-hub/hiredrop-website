// The rules of the employer-answers form, without React — so they can be tested with
// `node --test`. The LIST of questions is the server's (modules/employer_answers.py);
// nothing here knows which questions exist, only how one is answered.

export type AnswerKind = "text" | "yesno" | "us_resident";

// Which list of questions this build can ask PROPERLY (their "I don't have one"
// tickboxes included). Sent on /campaign/readiness, /campaign/start and the save; the
// server holds a client that sends nothing — a tab loaded before a question existed — to
// the list it has always seen, so nobody is asked something their screen cannot answer
// honestly. Bump together with ANSWERS_UI in modules/employer_answers.py.
export const ANSWERS_UI = 2;

/** `?answers_ui=N` for the three endpoints that count missing answers. */
export const answersUi = (path: string) => `${path}${path.includes("?") ? "&" : "?"}answers_ui=${ANSWERS_UI}`;

// A backend older than the tickboxes-travel-with-the-question change (a rollback) sends
// the LinkedIn question bare. Its opt-out existed long before that, so it is restored
// here rather than lost for as long as the rollback lasts.
const LEGACY_OPT_OUT: Record<string, { flag: string; label: string }> = {
  linkedin_url: { flag: "no_linkedin", label: "I don't have a LinkedIn" },
};

/** The questions as the form should draw them, whatever vintage of server sent them. */
export function normalizeQuestions(questions: AnswerQuestion[]): AnswerQuestion[] {
  return (questions || []).map((q) => {
    const kind: AnswerKind = q.kind === "yesno" || q.kind === "us_resident" ? q.kind : "text";
    return { ...q, kind, opt_out: q.opt_out ?? LEGACY_OPT_OUT[q.key] };
  });
}

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
  // When signup asks it: "signup" before the resume, "resume" after one is uploaded. An
  // older server sends none — then everything is asked at once, as it always was.
  stage?: string;
  // What is wrong with the answer on file, in the server's words (drawn under the question).
  note?: string;
}

/** Signup without a resume asks only what a resume could never answer; the rest waits
 *  for one. The Start gate still refuses until EVERY question is answered — this moves
 *  when they are asked, not whether. No stages from the server (older backend) = all. */
export function askNow(questions: AnswerQuestion[], hasResume: boolean): AnswerQuestion[] {
  if (hasResume || !questions.some((q) => q.stage)) return questions;
  return questions.filter((q) => q.stage !== "resume");
}

/** The questions to confirm as one group: the server says their suggestion came from the
 *  person's own resume (`from_resume`), nothing is on file yet, and there is a value to
 *  show. A server that does not say (`from_resume` absent) gets no group. */
export function resumeGroup(
  questions: AnswerQuestion[],
  fromResume: string[] | null | undefined,
  values: AnswerValues,
): string[] {
  if (!Array.isArray(fromResume)) return [];
  const said = new Set(fromResume);
  return questions
    .filter((q) => {
      const v = values[q.key];
      return said.has(q.key) && q.kind === "text" && !q.value && typeof v === "string" && v.trim() !== "";
    })
    .map((q) => q.key);
}

/** What the resume said is only an answer once the person says so — "Looks right" for the
 *  group, or by touching the box themselves. Until then it is not saved. */
export function awaitingConfirmation(
  group: string[],
  confirmed: Record<string, boolean>,
  questions: AnswerQuestion[],
  flags: AnswerFlags,
): string[] {
  return group.filter((key) => {
    const q = questions.find((x) => x.key === key);
    return !!q && !confirmed[key] && !optedOut(q, flags);
  });
}

/** What POST /profile/employer-answers/suggest found, from the server or the tab's cache. */
export interface ResumeHints {
  suggestions: Record<string, string>;
  // Which of them the resume itself said; null = a server too old to say.
  fromResume: string[] | null;
}

export function parseHints(raw: unknown): ResumeHints | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { suggestions?: unknown; from_resume?: unknown };
  if (!r.suggestions || typeof r.suggestions !== "object") return null;
  const suggestions: Record<string, string> = {};
  for (const [k, v] of Object.entries(r.suggestions as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) suggestions[k] = v;
  }
  const fromResume = Array.isArray(r.from_resume)
    ? r.from_resume.filter((k): k is string => typeof k === "string")
    : null;
  return { suggestions, fromResume };
}

/** One cache entry per resume FILE: a new upload is a new name (lib/resume/upload), so
 *  what the previous resume said can never be served for this one. */
export const HINTS_PREFIX = "hd_answer_hints:";
export const hintCacheKey = (userId: string, resume: string | null | undefined) =>
  `${HINTS_PREFIX}${userId}:${resume || ""}`;

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
