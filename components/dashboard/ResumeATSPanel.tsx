"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

const ATS_PASS_THRESHOLD = 80;

async function apiCall(path: string, token: string, method = "GET", body?: unknown) {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
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

interface ATSData {
  atsScore: number | null;
  atsIssues: string[];
  atsIssueLabels: string[];
  atsResumeUrl: string | null;
  atsApproved: boolean;
  atsCheckedAt: string | null;
  resumeUrl: string | null;
}

interface QA { question: string; answer: string; }

const ISSUE_LABELS: Record<string, string> = {
  columns: "Multi-column layout — ATS reads left-to-right and may jumble columns",
  tables: "Tables — ATS often can't parse table cells",
  images: "Images or graphics — ATS ignores non-text content",
  text_boxes: "Floating text boxes / complex layout",
  special_chars: "Special symbols or icons — may render as garbage",
};

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const fill = (score / 100) * circ;
  const color = score >= ATS_PASS_THRESHOLD ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= ATS_PASS_THRESHOLD ? "Passes ATS" : score >= 60 ? "Needs work" : "Poor";

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-surface2" />
          <circle cx="42" cy="42" r={radius} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-text">{score}</span>
          <span className="text-[9px] text-text2">/100</span>
        </div>
      </div>
      <div>
        <p className="font-semibold text-text" style={{ color }}>{label}</p>
        <p className="text-xs text-text2 mt-0.5">ATS Compatibility Score</p>
      </div>
    </div>
  );
}

export default function ResumeATSPanel() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<ATSData>({
    atsScore: null, atsIssues: [], atsIssueLabels: [], atsResumeUrl: null,
    atsApproved: false, atsCheckedAt: null, resumeUrl: null,
  });
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<"ats" | "original">("ats");
  const [showPreview, setShowPreview] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<QA[]>([]);
  const [generating, setGenerating] = useState(false);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  }, [supabase]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (p) {
        setData({
          atsScore: p.ats_score ?? null,
          atsIssues: p.ats_issues || [],
          atsIssueLabels: (p.ats_issues || []).map((k: string) => ISSUE_LABELS[k] || k),
          atsResumeUrl: p.ats_resume_url || null,
          atsApproved: p.ats_approved || false,
          atsCheckedAt: p.ats_checked_at || null,
          resumeUrl: p.resume_url || null,
        });
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleUploadNew(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;
    e.target.value = "";

    setUploading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const { error: uploadError } = await supabase.storage
      .from("resumes").upload(`${user.id}/resume.pdf`, file, { upsert: true });

    if (uploadError) { setError("Upload failed. Please try again."); setUploading(false); return; }

    await supabase.from("profiles").update({
      resume_url: `${user.id}/resume.pdf`,
      ats_approved: false, ats_score: null, ats_issues: [], ats_checked_at: null,
    }).eq("user_id", user.id);

    setData(prev => ({
      ...prev, resumeUrl: `${user.id}/resume.pdf`,
      atsApproved: false, atsScore: null, atsIssues: [], atsIssueLabels: [], atsCheckedAt: null,
    }));
    setPreviewUrl(null);
    setUploading(false);
    flash("Resume uploaded. Run ATS check to analyze it.");
  }

  async function handleCheck() {
    setChecking(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/ats/check", token, "POST");
      setData(prev => ({
        ...prev,
        atsScore: result.score,
        atsIssues: result.issues,
        atsIssueLabels: result.issue_labels,
        atsCheckedAt: new Date().toISOString(),
      }));
      const ok = typeof result.passes === "boolean"
        ? result.passes
        : result.score >= ATS_PASS_THRESHOLD;
      if (ok) {
        flash(`Score ${result.score}/100 — your resume passes ATS. No changes needed.`);
      } else if (result.has_structural) {
        flash(`Design blocks detected — ATS can't read this layout. Generate a clean version below.`);
      } else {
        flash(`Score ${result.score}/100 — generate an ATS-optimized version below.`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ATS check failed");
    }
    setChecking(false);
  }

  async function handleOpenQA() {
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/ats/questions", token, "POST");
      const qs: string[] = result.questions || [];
      setQuestions(qs);
      setAnswers(qs.map((q: string) => ({ question: q, answer: "" })));
      setSkipped(new Set());
      setShowQA(true);
    } catch {
      // If questions fail, go straight to generate
      await handleGenerate([]);
    }
  }

  async function handleGenerate(filledAnswers: QA[]) {
    setShowQA(false);
    setGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/ats/generate", token, "POST", {
        answers: filledAnswers.filter(a => a.answer.trim()),
      });
      setPreviewUrl(result.preview_url);
      setDocxUrl(result.docx_url || null);
      setPreviewKind("ats");
      setData(prev => ({ ...prev, atsResumeUrl: result.ats_resume_url }));
      setShowPreview(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
    }
    setGenerating(false);
  }

  async function handleViewATS() {
    if (previewUrl) { setShowPreview(true); return; }
    setGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/ats/resume/url", token);
      setPreviewUrl(result.url);
      setPreviewKind("ats");
      // DOCX is a bonus format — fetch its URL too, ignore if absent
      try {
        const docx = await apiCall("/profile/ats/resume/docx-url", token);
        setDocxUrl(docx.url || null);
      } catch { setDocxUrl(null); }
      setShowPreview(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load ATS resume");
    }
    setGenerating(false);
  }

  async function handleViewOriginal() {
    setGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/resume/url", token);
      setPreviewUrl(result.url);
      setDocxUrl(null);
      setPreviewKind("original");
      setShowPreview(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load resume");
    }
    setGenerating(false);
  }

  async function handleApprove() {
    setApproving(true);
    setError(null);
    try {
      const token = await getToken();
      await apiCall("/profile/ats/approve", token, "POST");
      setData(prev => ({ ...prev, atsApproved: true }));
      setShowPreview(false);
      flash("ATS version is now active — will be sent to all employers.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
    setApproving(false);
  }

  async function handleDecline() {
    setApproving(true);
    try {
      const token = await getToken();
      await apiCall("/profile/ats/decline", token, "POST");
      setData(prev => ({ ...prev, atsApproved: false }));
      setShowPreview(false);
      flash("Original resume is now active.");
    } catch { /* best effort */ }
    setApproving(false);
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  if (loading) return (
    <section className="bg-surface border border-border rounded-xl p-6">
      <div className="animate-pulse h-4 w-40 bg-surface2 rounded" />
    </section>
  );

  const hasResume = !!data.resumeUrl;
  const hasATS = !!data.atsResumeUrl;
  const wasChecked = data.atsScore !== null;
  // A resume "passes" only with no design blockers AND a score over threshold.
  // Design blocks (columns/tables/images/floating blocks) force regeneration.
  const STRUCTURAL_ISSUES = ["columns", "tables", "images", "text_boxes"];
  const hasStructural = data.atsIssues.some(i => STRUCTURAL_ISSUES.includes(i));
  const passes = wasChecked && !hasStructural && (data.atsScore ?? 0) >= ATS_PASS_THRESHOLD;

  return (
    <section className="bg-surface border border-border rounded-xl p-6 space-y-5">

      {/* Header + active badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text">Resume & ATS</h3>
          <p className="text-xs text-text2 mt-0.5">Manage which version employers receive.</p>
        </div>
        {hasResume && (
          <div className={[
            "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0",
            data.atsApproved
              ? "bg-green/10 border-green text-green"
              : "bg-surface2 border-border text-text2",
          ].join(" ")}>
            <span className={`w-1.5 h-1.5 rounded-full ${data.atsApproved ? "bg-green" : "bg-text2"}`} />
            {data.atsApproved ? "ATS version active" : "Original active"}
          </div>
        )}
      </div>

      {error && <div className="p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">{error}</div>}
      {successMsg && <div className="p-3 rounded-lg bg-green/10 border border-green/20 text-green text-sm">{successMsg}</div>}

      {/* What employers actually receive — single source of truth */}
      {hasResume && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/5 border border-accent/20">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text2">Sent to employers</p>
            <p className="text-sm font-semibold text-text">
              {data.atsApproved
                ? "Your ATS-optimized resume"
                : "Your original resume — already ATS-ready"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={data.atsApproved ? handleViewATS : handleViewOriginal}
            disabled={generating}
          >
            {generating ? "Loading…" : "View"}
          </Button>
        </div>
      )}

      {/* Resume file row */}
      <div className="flex items-center gap-3 p-4 bg-surface2 rounded-xl border border-border">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">{hasResume ? "resume.pdf" : "No resume uploaded"}</p>
          <p className="text-xs text-text2">{hasResume ? "Stored in Supabase Storage" : "Upload a PDF to enable auto-apply"}</p>
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleUploadNew} className="hidden" />
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : hasResume ? "Replace" : "Upload"}
        </Button>
      </div>

      {/* ATS Score block */}
      {hasResume && (
        <div className="p-4 bg-surface2 rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text2 uppercase tracking-wide">ATS Score</span>
            {wasChecked && data.atsCheckedAt && (
              <span className="text-xs text-text2">Checked {formatDate(data.atsCheckedAt)}</span>
            )}
          </div>

          {wasChecked && data.atsScore !== null ? (
            <div className="space-y-3">
              <ScoreRing score={data.atsScore} />
              {data.atsIssueLabels.length > 0 && (
                <div className="space-y-1.5">
                  {data.atsIssueLabels.map((label, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text">
                      <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-red/15 text-red flex items-center justify-center text-[10px] font-bold">!</span>
                      {label}
                    </div>
                  ))}
                </div>
              )}
              {passes && !data.atsIssueLabels.length && (
                <p className="text-sm text-green">No formatting issues detected.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-text2">Run a check to see how your resume scores with ATS systems.</p>
          )}

          <Button variant="secondary" size="sm" onClick={handleCheck} disabled={checking}>
            {checking ? "Checking…" : wasChecked ? "Re-run Check" : "Run ATS Check"}
          </Button>
        </div>
      )}

      {/* ATS Version block — only show if score < threshold */}
      {hasResume && wasChecked && !passes && (
        <div className="p-4 bg-surface2 rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text2 uppercase tracking-wide">ATS-Optimized Version</span>
            {hasATS && (
              <span className={`text-xs font-semibold ${data.atsApproved ? "text-green" : "text-text2"}`}>
                {data.atsApproved ? "Active" : "Not active"}
              </span>
            )}
          </div>

          <p className="text-sm text-text2">
            {hasATS
              ? data.atsApproved
                ? "This clean version is being sent to employers."
                : "Generated. Activate it to start using it."
              : "We'll ask you a few quick questions, then generate a clean version."}
          </p>

          <div className="flex flex-wrap gap-2">
            {hasATS && (
              <Button variant="secondary" size="sm" onClick={handleViewATS} disabled={generating}>
                {generating ? "Loading…" : "View"}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleOpenQA} disabled={generating}>
              {generating ? "Generating…" : hasATS ? "Regenerate" : "Generate ATS Version"}
            </Button>
            {hasATS && !data.atsApproved && (
              <Button size="sm" onClick={handleApprove} disabled={approving}>
                {approving ? "Saving…" : "Use ATS Version"}
              </Button>
            )}
            {hasATS && data.atsApproved && (
              <Button variant="secondary" size="sm" onClick={handleDecline} disabled={approving}>
                {approving ? "Saving…" : "Use Original"}
              </Button>
            )}
          </div>
          <p className="text-xs text-text2">To change content — upload a new resume and regenerate.</p>
        </div>
      )}

      {/* Q&A Modal */}
      {showQA && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="font-semibold text-text">A few quick questions</h3>
              <p className="text-xs text-text2 mt-0.5">ATS searches for exact tool names. Your answers go directly into Technical Skills — the section ATS scans first.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {questions.map((q, i) => {
                const isSkipped = skipped.has(i);
                return (
                  <div key={i} className={isSkipped ? "opacity-40" : ""}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm text-text flex-1 pr-2">{q}</label>
                      <button
                        onClick={() => setSkipped(prev => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i); else next.add(i);
                          return next;
                        })}
                        className="text-xs text-text2 hover:text-text transition flex-shrink-0"
                      >
                        {isSkipped ? "Undo" : "Skip"}
                      </button>
                    </div>
                    {!isSkipped && (
                      <input
                        type="text"
                        value={answers[i]?.answer || ""}
                        onChange={e => setAnswers(prev => prev.map((a, idx) => idx === i ? { ...a, answer: e.target.value } : a))}
                        placeholder="Your answer…"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-text placeholder-text2 focus:outline-none focus:border-accent"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <Button onClick={() => handleGenerate(answers.filter((_, i) => !skipped.has(i)))}>
                Generate ATS Resume
              </Button>
              <Button variant="secondary" onClick={() => handleGenerate([])}>
                Skip All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-text">
                  {previewKind === "ats" ? "ATS-Optimized Resume" : "Your Current Resume"}
                </h3>
                <p className="text-xs text-text2 mt-0.5">
                  {previewKind === "ats"
                    ? "Same content · ATS-safe format"
                    : "This is the file employers receive right now"}
                </p>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-text2 hover:text-text p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={previewUrl} className="w-full h-full" style={{ minHeight: 500 }} title="ATS Resume" />
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-border">
              {/* Approve/decline only make sense for the generated ATS version */}
              {previewKind === "ats" && (
                !data.atsApproved ? (
                  <Button onClick={handleApprove} disabled={approving}>
                    {approving ? "Saving…" : "Use This Version"}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={handleDecline} disabled={approving}>
                    {approving ? "Saving…" : "Use Original Instead"}
                  </Button>
                )
              )}
              <div className="ml-auto flex items-center gap-3">
                <a
                  href={previewUrl}
                  download={previewKind === "ats" ? "resume_ats.pdf" : "resume.pdf"}
                  className="text-sm text-accent hover:underline"
                >
                  Download PDF
                </a>
                {previewKind === "ats" && docxUrl && (
                  <a href={docxUrl} download="resume_ats.docx" className="text-sm text-accent hover:underline">
                    Download Word
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
