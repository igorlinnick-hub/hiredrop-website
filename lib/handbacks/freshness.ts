/**
 * How long a hand-back stays a to-do before it is honestly just a record.
 *
 * Nothing keeps the half-filled form alive (Igor, 2026-10-08): what the robot typed
 * lived in the apply session of the automation window, and the employer's side resets
 * within about a day — ZipRecruiter's "posting" link is really the results page plus
 * lk=<uuid>, and once the job rotates off that page the pane opens EMPTY; Ashby /
 * Greenhouse guest forms start blank on every visit. So after a day the link opens a
 * fresh form at best and an empty preview at worst, and a row that still blinks
 * "finish me" is lying. It stays listed — it IS history — but muted, with the copy
 * saying the form started over.
 */
export const HANDBACK_FRESH_MS = 24 * 60 * 60 * 1000;

/** True when the row is older than the window a human can realistically resume in.
 *  A row without created_at (API older than 10-08) is treated as still fresh — wrongly
 *  blinking beats silently burying a job that may still be finishable. */
export function handbackExpired(createdAt: string | null | undefined, nowMs: number): boolean {
  if (!createdAt) return false;
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return false;
  return nowMs - t > HANDBACK_FRESH_MS;
}

/** "28m ago" / "5h ago" / "yesterday" / "6d ago" — enough to judge whether the form is
 *  still warm, never a timestamp to study. Null when the row carries no created_at. */
export function handbackAge(createdAt: string | null | undefined, nowMs: number): string | null {
  if (!createdAt) return null;
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return null;
  const mins = Math.max(0, Math.floor((nowMs - t) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
