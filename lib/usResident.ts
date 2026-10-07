// "Do you live in the United States?" is the FIRST thing signup asks (Igor, 10-07): HireDrop
// applies to US jobs only, so someone abroad learns it on screen one, not after the resume
// and six steps of setup. The question itself is the server's (GET /profile/employer-answers,
// the `us_resident` row) — this file never names its key or its wording.

import type { AnswerQuestion } from "./employerAnswers.ts";

/** The residency question in the server's list, or null when the list didn't load. */
export function residencyQuestion(questions: AnswerQuestion[] | null | undefined): AnswerQuestion | null {
  return (questions || []).find((q) => q.kind === "us_resident") || null;
}

/** May the person leave the first step? Only with a Yes. When the question never loaded
 *  (our API down, a backend without it), the step stays passable: the answers step and the
 *  Start gate ask the same question, so an outage of ours is not what stops a signup. */
export function mayContinue(question: AnswerQuestion | null, answer: boolean | null): boolean {
  return question === null || answer === true;
}
