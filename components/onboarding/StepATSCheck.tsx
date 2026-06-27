"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

const ATS_PASS_THRESHOLD = 80;

async function apiPost(path: string, token: string, body?: unknown) {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || res.statusText);
  }
  return res.json();
}

type State =
  | "checking"
  | "pass"        // score >= 80, no action needed
  | "questions"   // score < 80, collecting user answers
  | "generating"
  | "preview"
  | "approving"
  | "done_ats"
  | "done_original";

interface CheckResult {
  score: number;
  issues: string[];
  issue_labels: string[];
  passes?: boolean;
  has_structural?: boolean;
}

interface QA {
  question: string;
  answer: string;
}

interface Props {
  onNext: () => void;
  onBack: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const fill = (score / 100) * circ;
  const color = score >= ATS_PASS_THRESHOLD ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface2" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-text">{score}</span>
        <span className="text-[10px] text-text2 font-medium">/100</span>
      </div>
    </div>
  );
}

export default function StepATSCheck({ onNext, onBack }: Props) {
  const supabase = createClient();
  const [state, setState] = useState<State>("checking");
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<QA[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  }, [supabase]);

  useEffect(() => {
    async function run() {
      try {
        const token = await getToken();
        const result = await apiPost("/profile/ats/check", token);
        setCheckResult(result);

        // Backend decides: no design blockers AND score over threshold.
        // Fall back to score-only if an older backend doesn't return `passes`.
        const ok = typeof result.passes === "boolean"
          ? result.passes
          : result.score >= ATS_PASS_THRESHOLD;
        if (ok) {
          setState("pass");
        } else {
          // Load questions in parallel
          try {
            const qResult = await apiPost("/profile/ats/questions", token);
            const qs: string[] = qResult.questions || [];
            setQuestions(qs);
            setAnswers(qs.map((q: string) => ({ question: q, answer: "" })));
          } catch {
            setQuestions([]);
          }
          setState("questions");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Check failed");
        setState("questions"); // still show continue option
      }
    }
    run();
  }, [getToken]);

  function updateAnswer(i: number, value: string) {
    setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: value } : a));
  }

  async function handleGenerate() {
    setState("generating");
    setError(null);
    try {
      const token = await getToken();
      const filledAnswers = answers.filter(a => a.answer.trim());
      const result = await apiPost("/profile/ats/generate", token, {
        answers: filledAnswers,
      });
      setPreviewUrl(result.preview_url);
      setState("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setState("questions");
    }
  }

  async function handleApprove() {
    setState("approving");
    setError(null);
    try {
      const token = await getToken();
      await apiPost("/profile/ats/approve", token);
      setState("done_ats");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save");
      setState("preview");
    }
  }

  async function handleUseOriginal() {
    try {
      const token = await getToken();
      await apiPost("/profile/ats/decline", token);
    } catch { /* best effort */ }
    setState("done_original");
  }

  const issueCount = checkResult?.issue_labels?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Checking ── */}
      {state === "checking" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text2 text-sm">Scanning your resume for ATS compatibility…</p>
        </div>
      )}

      {/* ── Pass (score ≥ 80) ── */}
      {state === "pass" && checkResult && (
        <div className="flex flex-col items-center text-center gap-5 py-8">
          <ScoreRing score={checkResult.score} />
          <div>
            <p className="text-xl font-bold text-text">Your resume passes ATS screening</p>
            <p className="text-sm text-text2 mt-1 max-w-xs mx-auto">
              Score {checkResult.score}/100 — no critical formatting issues. We&apos;ll submit it as-is.
            </p>
          </div>
          <button
            onClick={onNext}
            className="bg-accent text-white rounded-xl px-8 py-3 font-medium hover:bg-accent/90 transition"
          >
            Continue
          </button>
          <button onClick={onBack} className="text-xs text-text2 hover:text-text transition">Back</button>
        </div>
      )}

      {/* ── Questions (score < 80) ── */}
      {state === "questions" && (
        <div>
          <div className="flex items-start gap-5 mb-5">
            {checkResult && <ScoreRing score={checkResult.score} />}
            <div className="flex-1 pt-1">
              <p className="font-bold text-text text-lg">
                {checkResult ? `Score ${checkResult.score}/100 — needs formatting fixes` : "ATS Check"}
              </p>
              {issueCount > 0 && (
                <div className="mt-2 space-y-1">
                  {checkResult!.issue_labels.map((label, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text">
                      <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-red/20 text-red flex items-center justify-center text-[10px] font-bold">!</span>
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">{error}</div>
          )}

          {questions.length > 0 && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-text mb-1">
                Help ATS find your skills
              </p>
              <p className="text-xs text-text2 mb-4">
                ATS systems search for exact tool names and software. Your resume implies you used these — confirm the specifics so ATS can match you to job postings.
              </p>
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i}>
                    <label className="block text-sm text-text mb-1">{q}</label>
                    <input
                      type="text"
                      value={answers[i]?.answer || ""}
                      onChange={e => updateAnswer(i, e.target.value)}
                      placeholder="Your answer…"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface text-text placeholder-text2 focus:outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={handleGenerate}
              className="w-full bg-accent text-white rounded-xl py-3 font-medium hover:bg-accent/90 transition"
            >
              Generate My ATS Resume
            </button>
            <button
              onClick={handleUseOriginal}
              className="w-full border border-border text-text2 rounded-xl py-2.5 text-sm hover:text-text transition"
            >
              Skip — use my original resume
            </button>
          </div>
          <button onClick={onBack} className="mt-3 text-xs text-text2 hover:text-text transition block mx-auto">Back</button>
        </div>
      )}

      {/* ── Generating ── */}
      {state === "generating" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text font-medium">Building your ATS resume…</p>
          <p className="text-xs text-text2 text-center max-w-xs">
            Restructuring content, applying ATS-safe formatting, adding your answers.
          </p>
        </div>
      )}

      {/* ── Preview ── */}
      {state === "preview" && previewUrl && (
        <div>
          <div className="mb-4">
            <p className="text-lg font-bold text-text">Your ATS-Optimized Resume</p>
            <p className="text-sm text-text2 mt-0.5">Same experience · clean format · your answers added · ready for employers</p>
          </div>

          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">{error}</div>
          )}

          <div className="border border-border rounded-xl overflow-hidden mb-4" style={{ height: 420 }}>
            <iframe src={previewUrl} className="w-full h-full" title="ATS Resume Preview" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleApprove}
              className="bg-accent text-white rounded-xl py-3 font-medium hover:bg-accent/90 transition"
            >
              Use This Version
            </button>
            <button
              onClick={handleUseOriginal}
              className="border border-border text-text2 rounded-xl py-3 text-sm hover:text-text transition"
            >
              Keep My Original
            </button>
          </div>
          <p className="text-xs text-text2 text-center mt-2">
            To change your resume later — upload a new PDF in Settings.
          </p>
        </div>
      )}

      {/* ── Approving ── */}
      {state === "approving" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text2 text-sm">Saving your selection…</p>
        </div>
      )}

      {/* ── Done: ATS ── */}
      {state === "done_ats" && (
        <div className="flex flex-col items-center text-center gap-5 py-8">
          <div className="w-14 h-14 rounded-full bg-green/10 border-2 border-green flex items-center justify-center">
            <svg className="w-7 h-7 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-text">ATS resume activated</p>
            <p className="text-sm text-text2 mt-1 max-w-xs mx-auto">
              Your optimized version will be sent to employers. Much better chance of passing automated screening.
            </p>
          </div>
          <button
            onClick={onNext}
            className="bg-accent text-white rounded-xl px-8 py-3 font-medium hover:bg-accent/90 transition"
          >
            Continue
          </button>
        </div>
      )}

      {/* ── Done: Original ── */}
      {state === "done_original" && (
        <div className="flex flex-col items-center text-center gap-5 py-8">
          <div className="w-14 h-14 rounded-full bg-surface2 border-2 border-border flex items-center justify-center">
            <svg className="w-7 h-7 text-text2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-text">Original resume kept</p>
            <p className="text-sm text-text2 mt-1 max-w-xs mx-auto">
              You can generate an ATS version anytime from Settings → Resume.
            </p>
          </div>
          <button
            onClick={onNext}
            className="bg-accent text-white rounded-xl px-8 py-3 font-medium hover:bg-accent/90 transition"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
