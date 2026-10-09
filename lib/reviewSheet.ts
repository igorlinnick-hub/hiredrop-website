// The one-time check before the first run — everything we tell employers, on one page.
// The LIST is the server's (GET /profile/review, modules/review_sheet.py):
// nothing here knows which rows exist, only how one is shown and answered. Pure, so
// `node --test` can hold the rules.

import {
  buildBody,
  initialValues,
  isAnswered,
  livesAbroad,
  normalizeQuestions,
  type AnswerFlags,
  type AnswerQuestion,
  type AnswerValues,
} from "./employerAnswers.ts";

// `info` rows are shown, never edited: the sign-in email, and what every form gets the
// same way (the EEO decline).
export interface ReviewRow extends Omit<AnswerQuestion, "kind"> {
  kind: string;
  required?: boolean;
}

export interface ReviewSection {
  title: string;
  rows: ReviewRow[];
}

export const isInfo = (row: ReviewRow) => row.kind === "info";

/** The rows a person answers, typed the way the employer-answers helpers expect. An
 *  unknown kind from a newer server is drawn as text, like the answers form does. */
export function editableRows(sections: ReviewSection[]): AnswerQuestion[] {
  const rows = (sections || []).flatMap((s) => s.rows || []).filter((r) => !isInfo(r));
  return normalizeQuestions(rows as AnswerQuestion[]).map((q, i) => ({
    ...q,
    required: rows[i].required !== false,
  })) as (AnswerQuestion & { required: boolean })[];
}

export function reviewValues(sections: ReviewSection[]): AnswerValues {
  return initialValues(editableRows(sections));
}

/** The required rows still blank — the confirm button stays shut until this is empty. */
export function blankRows(sections: ReviewSection[], values: AnswerValues, flags: AnswerFlags): string[] {
  return (editableRows(sections) as (AnswerQuestion & { required: boolean })[])
    .filter((q) => q.required && !isAnswered(q, values, flags))
    .map((q) => q.key);
}

/** "Everything's correct" may be pressed: nothing required is blank, and the person lives
 *  in the US (a No is a closed door, the same as in the answers form). */
export function canConfirm(sections: ReviewSection[], values: AnswerValues, flags: AnswerFlags): boolean {
  return blankRows(sections, values, flags).length === 0 && !livesAbroad(editableRows(sections), values);
}

/** The POST body: every editable row's answer, every opt-out as a real boolean. */
export function reviewBody(
  sections: ReviewSection[],
  values: AnswerValues,
  flags: AnswerFlags,
): Record<string, string | boolean> {
  return buildBody(editableRows(sections), values, flags);
}

/** The keys the server still found blank after a save, whichever list named them. */
/** The server's reason per row it refused (e.g. answers that contradict each other) —
 * such a row is not blank, so without this the sheet would say "fill in the outlined
 * ones" and outline nothing. */
export function serverNotes(res: unknown): Record<string, string> {
  const r = (res || {}) as { missing?: { key?: unknown; note?: unknown }[] };
  return Object.fromEntries(
    (Array.isArray(r.missing) ? r.missing : []).flatMap((m) =>
      typeof m?.key === "string" && typeof m?.note === "string" && m.note ? [[m.key, m.note]] : [],
    ),
  );
}

export function stillBlank(res: unknown): string[] {
  const r = (res || {}) as { missing?: { key?: unknown }[]; incomplete?: unknown[] };
  const fromMissing = (Array.isArray(r.missing) ? r.missing : [])
    .map((m) => m?.key)
    .filter((k): k is string => typeof k === "string");
  const fromIncomplete = (Array.isArray(r.incomplete) ? r.incomplete : []).filter(
    (k): k is string => typeof k === "string",
  );
  return [...fromMissing, ...fromIncomplete];
}
