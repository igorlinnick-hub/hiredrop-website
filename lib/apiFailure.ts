/**
 * A failed request to /api/v1, said in words a person can act on. Shared by Drop's cards
 * and the "About you" answers, which hit the same endpoints and the same refusals:
 * a 400 pick_an_option (the employer's form takes fixed choices) and a 503
 * facts_not_ready (the answers store isn't switched on yet).
 *
 * Duck-typed over ApiError (lib/api.ts) so it runs under `node --test` without app imports.
 */

/** Why a request failed, in words, plus the choices when the form only takes fixed ones. */
export interface Failure {
  message: string;
  options?: string[];
}

export function describeFailure(e: unknown): Failure {
  const err = (e && typeof e === "object" ? e : {}) as { status?: number; detail?: unknown; message?: string };
  const detail = err.detail && typeof err.detail === "object" ? (err.detail as { error?: unknown; options?: unknown }) : null;
  if (detail?.error === "pick_an_option" && Array.isArray(detail.options)) {
    const options = detail.options.filter((o): o is string => typeof o === "string" && !!o);
    if (options.length) return { message: "The employer only takes one of these answers. Pick one:", options };
  }
  if (err.status === 401) return { message: "Your session expired. Refresh the page and try again." };
  if (err.status === 503 && err.message === "facts_not_ready") {
    return { message: "Saving answers isn't switched on yet. Try again a little later." };
  }
  if (e instanceof TypeError) return { message: "Couldn't reach the server. Check your connection and try again." };
  const msg = typeof err.message === "string" ? err.message.trim() : "";
  // A bare code (snake_case) is for us, not for the person.
  if (!msg || /^[a-z0-9_]+$/.test(msg)) return { message: "That didn't go through. Try again in a minute." };
  return { message: msg };
}
