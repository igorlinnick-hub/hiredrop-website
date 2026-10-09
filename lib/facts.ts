/**
 * What the person told us about themselves, asked once and remembered (jobflow
 * app/routers/personal.py). Every surface that asks (extension popup, History, Drop's
 * cards, Settings) saves through POST /profile/facts, so "answered once" means the same
 * thing everywhere, and the backend puts the answer on every waiting application.
 */

import { apiDelete, apiGet, apiPost } from "@/lib/api";

export interface PersonalFact {
  id: string;
  topic: string;
  /** A short label ("Relocation plans") or the employer's exact question. */
  question: string;
  answer: string;
  /** Mentioned in cover letters where it fits the job. */
  in_letters: boolean;
  source: string;
  updated_at: string;
}

/** A question only the person can answer, waiting on one or more applications. */
export interface PersonalQuestion {
  question: string;
  options: string[];
  topic: string;
  topic_label: string;
  /** What they said before on the same topic. */
  related: PersonalFact[];
  jobs: { handback_id: string; title: string; company: string; platform: string }[];
  last_seen: string | null;
}

export interface FactInput {
  question: string;
  answer: string;
  in_letters?: boolean;
  /** Earlier facts this one replaces (an edited label leaves the old one behind otherwise). */
  replace_ids?: string[];
  /** Where it was answered: measurement only. */
  source: "settings" | "history";
}

export interface FactSaved {
  ok: boolean;
  fact: PersonalFact;
  facts: PersonalFact[];
  /** Waiting applications this answer completed and put back in the queue. */
  requeued: number;
  still_waiting: number;
}

export const MAX_QUESTION = 300;
export const MAX_ANSWER = 500;

export function listFacts(token: string) {
  return apiGet<{ facts: PersonalFact[]; topics: Record<string, string> }>("/profile/facts", token);
}

export function saveFact(token: string, body: FactInput) {
  return apiPost<FactSaved>("/profile/facts", token, body);
}

export function deleteFact(token: string, id: string) {
  return apiDelete<{ ok: boolean; facts: PersonalFact[] }>(`/profile/facts/${encodeURIComponent(id)}`, token);
}

export function listPersonalQuestions(token: string) {
  return apiGet<{ questions: PersonalQuestion[] }>("/personal-questions", token);
}
