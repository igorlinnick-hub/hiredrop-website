"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

async function apiPost(path: string, token: string, body?: unknown) {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || res.statusText);
  }
  return res.json();
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || res.statusText);
  }
  return res.json();
}

type CheckState =
  | "checking"
  | "results"
  | "generating"
  | "preview"
  | "editing"
  | "regenerating"
  | "approving"
  | "done";

interface CheckResult {
  score: number;
  issues: string[];
  issue_labels: string[];
  page_count: number;
}

const ISSUE_EMOJI: Record<string, string> = {
  columns: "Columns",
  tables: "Tables",
  images: "Images/Graphics",
  text_boxes: "Text Boxes",
  special_chars: "Special Characters",
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? "text-green border-green bg-green/10" :
    score >= 60 ? "text-yellow-500 border-yellow-500 bg-yellow-500/10" :
    "text-red border-red bg-red/10";
  const label =
    score >= 85 ? "ATS Ready" :
    score >= 60 ? "Needs Work" :
    "Poor ATS Compatibility";

  return (
    <div className={`inline-flex flex-col items-center border-2 rounded-xl px-6 py-4 ${color}`}>
      <span className="text-4xl font-bold">{score}</span>
      <span className="text-xs font-semibold mt-0.5 uppercase tracking-wide">{label}</span>
    </div>
  );
}

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function StepATSCheck({ onNext, onBack }: Props) {
  const supabase = createClient();
  const [state, setState] = useState<CheckState>("checking");
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  }, [supabase]);

  useEffect(() => {
    async function runCheck() {
      try {
        const token = await getToken();
        const result = await apiPost("/profile/ats/check", token);
        setCheckResult(result);
        setState("results");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "ATS check failed");
        setState("results");
      }
    }
    runCheck();
  }, [getToken]);

  async function handleGenerate() {
    setError(null);
    setState("generating");
    try {
      const token = await getToken();
      const result = await apiPost("/profile/ats/generate", token);
      setPreviewUrl(result.preview_url);
      setState("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setState("results");
    }
  }

  async function handleApprove() {
    setError(null);
    setState("approving");
    try {
      const token = await getToken();
      await apiPost("/profile/ats/approve", token);
      setState("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save approval");
      setState("preview");
    }
  }

  async function handleDecline() {
    setError(null);
    try {
      const token = await getToken();
      await apiPost("/profile/ats/decline", token);
    } catch {
      // Best effort — not blocking
    }
    setDeclined(true);
    setState("done");
  }

  async function handleOpenEdit() {
    setError(null);
    try {
      const token = await getToken();
      const data = await apiGet("/profile/resume/text", token);
      setEditText(data.text || "");
      setState("editing");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load resume text");
    }
  }

  async function handleRegenerateFromEdit() {
    if (!editText.trim()) return;
    setError(null);
    setState("regenerating");
    try {
      const token = await getToken();
      const result = await apiPost("/profile/ats/generate-from-text", token, {
        resume_text: editText,
      });
      setPreviewUrl(result.preview_url);
      setState("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Regeneration failed");
      setState("editing");
    }
  }

  function handleSkip() {
    onNext();
  }

  return (
    <div>
      {/* Checking */}
      {state === "checking" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text2 text-sm">Scanning your resume for ATS compatibility...</p>
        </div>
      )}

      {/* Results */}
      {state === "results" && (
        <div>
          <h2 className="text-xl font-bold text-text mb-1">ATS Compatibility Check</h2>
          <p className="text-text2 text-sm mb-6">
            Most companies use ATS software to scan resumes before a human ever reads them.
            A poorly formatted resume gets rejected automatically — even if you are the perfect candidate.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">{error}</div>
          )}

          {checkResult && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-5">
                <ScoreBadge score={checkResult.score} />
                <div className="flex-1">
                  <p className="text-sm text-text2 mb-2">
                    {checkResult.issues.length === 0
                      ? "No critical issues found. Your resume appears ATS-friendly."
                      : `${checkResult.issues.length} issue${checkResult.issues.length > 1 ? "s" : ""} found that may cause ATS rejection:`}
                  </p>
                  {checkResult.issue_labels.map((label, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-red/20 text-red flex-shrink-0 flex items-center justify-center text-xs font-bold">!</span>
                      <span className="text-sm text-text">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {checkResult.score < 100 && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                  <p className="text-sm font-medium text-text mb-1">
                    We can automatically fix these issues for you.
                  </p>
                  <p className="text-xs text-text2">
                    HireDrop will generate a clean, ATS-optimized version of your resume using the same content —
                    no experience invented, just properly formatted. You review and confirm before it&apos;s used.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {checkResult && checkResult.score < 100 ? (
              <button
                onClick={handleGenerate}
                className="flex-1 bg-accent text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition"
              >
                Generate ATS-Compliant Version
              </button>
            ) : null}
            <button
              onClick={handleSkip}
              className="flex-1 border border-border text-text2 rounded-lg px-4 py-2.5 text-sm hover:text-text transition"
            >
              {checkResult?.score === 100 ? "Continue" : "Keep My Original"}
            </button>
          </div>
          <button onClick={onBack} className="mt-3 text-xs text-text2 hover:text-text transition">
            Back
          </button>
        </div>
      )}

      {/* Generating */}
      {state === "generating" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text2 text-sm">Generating your ATS-compliant resume...</p>
          <p className="text-xs text-text2 max-w-xs text-center">
            Our AI is restructuring your resume with clean formatting, proper fonts, and no tables or columns.
          </p>
        </div>
      )}

      {/* Preview */}
      {state === "preview" && previewUrl && (
        <div>
          <h2 className="text-xl font-bold text-text mb-1">Your ATS-Optimized Resume</h2>
          <p className="text-text2 text-sm mb-4">
            Review the version below. Same content, ATS-friendly format. Confirm to use it for all applications.
          </p>

          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">{error}</div>
          )}

          <div className="border border-border rounded-xl overflow-hidden mb-4" style={{ height: "420px" }}>
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="ATS Resume Preview"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              className="flex-1 bg-accent text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition"
            >
              Use This Version
            </button>
            <button
              onClick={handleOpenEdit}
              className="border border-border text-text2 rounded-lg px-4 py-2.5 text-sm hover:text-text transition"
            >
              Edit
            </button>
            <button
              onClick={handleDecline}
              className="border border-border text-text2 rounded-lg px-4 py-2.5 text-sm hover:text-text transition"
            >
              Keep Original
            </button>
          </div>
        </div>
      )}

      {/* Editing */}
      {(state === "editing" || state === "regenerating") && (
        <div>
          <h2 className="text-xl font-bold text-text mb-1">Edit Your Resume</h2>
          <p className="text-text2 text-sm mb-4">
            Make changes to the plain text below. When done, click Regenerate to create a fresh ATS-compliant PDF.
          </p>

          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">{error}</div>
          )}

          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full border border-border rounded-xl p-3 text-sm font-mono bg-surface text-text resize-none focus:outline-none focus:border-accent"
            style={{ height: "340px" }}
            disabled={state === "regenerating"}
          />

          <div className="flex gap-3 mt-3">
            <button
              onClick={handleRegenerateFromEdit}
              disabled={state === "regenerating" || !editText.trim()}
              className="flex-1 bg-accent text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === "regenerating" ? "Regenerating..." : "Regenerate PDF"}
            </button>
            <button
              onClick={() => setState("preview")}
              disabled={state === "regenerating"}
              className="border border-border text-text2 rounded-lg px-4 py-2.5 text-sm hover:text-text transition disabled:opacity-50"
            >
              Back to Preview
            </button>
          </div>
        </div>
      )}

      {/* Approving */}
      {state === "approving" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text2 text-sm">Saving your selection...</p>
        </div>
      )}

      {/* Done */}
      {state === "done" && (
        <div>
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-14 h-14 rounded-full bg-green/10 border-2 border-green flex items-center justify-center">
              <svg className="w-7 h-7 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text">
              {declined ? "Original resume kept" : "ATS version confirmed"}
            </h2>
            <p className="text-text2 text-sm text-center max-w-sm">
              {declined
                ? "We'll submit your original resume to employers. You can update this anytime in your profile settings."
                : "Your ATS-optimized resume will be submitted to employers. This significantly improves your chances of passing automated screening."}
            </p>
          </div>
          <button
            onClick={onNext}
            className="w-full bg-accent text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-accent/90 transition"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
