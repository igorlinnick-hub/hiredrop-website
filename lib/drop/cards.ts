/**
 * Pressing one of Drop's cards: its steps run in order, as the person, against /api/v1.
 *
 * Drop itself is read-only. A card is the server's offer of an ordinary request the
 * person could have made from Settings, so nothing here runs without their click, and
 * a step is refused unless it is a plain API path with a known verb. The call itself is
 * injected (`call`) so this file stays free of fetch and runs under `node --test`.
 */

import type { DropProposal, DropStep } from "./stream.ts";

export type CardMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type CardCall = (method: CardMethod, path: string, body: unknown) => Promise<unknown>;

const METHODS = new Set<string>(["GET", "POST", "PUT", "PATCH", "DELETE"]);
// A path under /api/v1 and nothing else: no scheme, host, query or parent segment.
const API_PATH = /^\/[A-Za-z0-9_\-/.]+$/;

export function stepAllowed(step: DropStep): boolean {
  return METHODS.has(step.method) && API_PATH.test(step.path) && !step.path.includes("..") && !step.path.includes("//");
}

/** Where a card may send the person: a dashboard page of this site. */
export function cardDestination(path: string | null): string | null {
  if (!path || !/^\/dashboard(\/|\?|$)/.test(path) || path.includes("//")) return null;
  return path;
}

/** Run every step, one after another; the first failure stops the rest and is thrown. */
export async function runSteps(steps: DropStep[], call: CardCall): Promise<void> {
  const bad = steps.find((s) => !stepAllowed(s));
  if (bad) throw new Error("This button can't run here.");
  for (const s of steps) await call(s.method as CardMethod, s.path, s.body);
}

/** The same card with the person's pick as the answer it saves (after pick_an_option). */
export function withAnswer(card: DropProposal, answer: string): DropProposal {
  return {
    ...card,
    steps: card.steps.map((s) =>
      s.method === "POST" && s.path === "/profile/facts" && s.body && typeof s.body === "object"
        ? { ...s, body: { ...(s.body as Record<string, unknown>), answer } }
        : s,
    ),
  };
}
