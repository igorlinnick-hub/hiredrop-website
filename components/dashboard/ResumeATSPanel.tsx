"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

async function apiCall(path: string, token: string, method = "GET", body?: unknown) {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
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

interface ATSData {
  atsScore: number | null;
  atsIssues: string[];
  atsIssueLabels: string[];
  atsResumeUrl: string | null;
  atsApproved: boolean;
  atsCheckedAt: string | null;
  resumeUrl: string | null;
}

const ISSUE_LABELS: Record<string, string> = {
  columns: "Multi-column layout — ATS can't read side-by-side content",
  tables: "Tables — ATS often can't parse table cells",
  images: "Images or graphics — ATS ignores non-text content",
  text_boxes: "Floating text boxes / complex layout",
  special_chars: "Special symbols or icons — may render as garbage",
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? "text-green border-green bg-green/10" :
    score >= 60 ? "text-yellow-500 border-yellow-500 bg-yellow-500/10" :
    "text-red border-red bg-red/10";
  const label = score >= 85 ? "ATS Ready" : score >= 60 ? "Needs Work" : "Poor";
  return (
    <div className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 ${color}`}>
      <span className="text-lg font-bold">{score}</span>
      <span className="text-xs font-semibold">/100 · {label}</span>
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
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editText, setEditText] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  }, [supabase]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
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

    const filePath = `${user.id}/resume.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("resumes").upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError("Upload failed. Please try again.");
      setUploading(false);
      return;
    }

    await supabase.from("profiles").update({
      resume_url: filePath,
      ats_approved: false,
      ats_score: null,
      ats_issues: [],
      ats_checked_at: null,
    }).eq("user_id", user.id);

    setData(prev => ({ ...prev, resumeUrl: filePath, atsApproved: false, atsScore: null, atsIssues: [], atsIssueLabels: [], atsCheckedAt: null }));
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
      flash("ATS check complete.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ATS check failed");
    }
    setChecking(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/ats/generate", token, "POST");
      setPreviewUrl(result.preview_url);
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
      setShowPreview(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load ATS resume");
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
      flash("ATS version is now active — will be sent to employers.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
    setApproving(false);
  }

  async function handleDecline() {
    setApproving(true);
    setError(null);
    try {
      const token = await getToken();
      await apiCall("/profile/ats/decline", token, "POST");
      setData(prev => ({ ...prev, atsApproved: false }));
      setShowPreview(false);
      flash("Original resume will be used.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
    setApproving(false);
  }

  async function handleOpenEdit() {
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/resume/text", token);
      setEditText(result.text || "");
      setShowPreview(false);
      setShowEdit(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load resume text");
    }
  }

  async function handleRegenerateFromEdit() {
    if (!editText.trim()) return;
    setRegenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/ats/generate-from-text", token, "POST", { resume_text: editText });
      setPreviewUrl(result.preview_url);
      setShowEdit(false);
      setShowPreview(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Regeneration failed");
    }
    setRegenerating(false);
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <section className="bg-surface border border-border rounded-xl p-6">
        <div className="animate-pulse h-4 w-32 bg-surface2 rounded" />
      </section>
    );
  }

  const hasResume = !!data.resumeUrl;
  const hasATS = !!data.atsResumeUrl;
  const wasChecked = data.atsScore !== null;

  return (
    <section className="bg-surface border border-border rounded-xl p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-text">Resume & ATS</h3>
          <p className="text-xs text-text2 mt-0.5">
            Control which resume version gets submitted to employers.
          </p>
        </div>
        {hasResume && (
          <div className={[
            "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border",
            data.atsApproved
              ? "bg-green/10 border-green text-green"
              : "bg-surface2 border-border text-text2",
          ].join(" ")}>
            <span className={`w-1.5 h-1.5 rounded-full ${data.atsApproved ? "bg-green" : "bg-text2"}`} />
            {data.atsApproved ? "ATS version active" : "Original active"}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">{error}</div>
      )}
      {successMsg && (
        <div className="p-3 rounded-lg bg-green/10 border border-green/20 text-green text-sm">{successMsg}</div>
      )}

      {/* Current Resume */}
      <div className="p-4 bg-surface2 rounded-xl border border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text2 uppercase tracking-wide">Your Resume</span>
        </div>
        {hasResume ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">resume.pdf</p>
              <p className="text-xs text-text2">Uploaded to Supabase Storage</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text2">No resume uploaded yet.</p>
        )}
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleUploadNew} className="hidden" />
          <Button
            variant="secondary" size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : hasResume ? "Replace Resume" : "Upload Resume"}
          </Button>
        </div>
      </div>

      {/* ATS Score */}
      {hasResume && (
        <div className="p-4 bg-surface2 rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text2 uppercase tracking-wide">ATS Score</span>
            {wasChecked && data.atsCheckedAt && (
              <span className="text-xs text-text2">Checked {formatDate(data.atsCheckedAt)}</span>
            )}
          </div>
          {wasChecked && data.atsScore !== null ? (
            <div className="space-y-2">
              <ScoreBadge score={data.atsScore} />
              {data.atsIssueLabels.length > 0 && (
                <div className="space-y-1 mt-2">
                  {data.atsIssueLabels.map((label, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text">
                      <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-red/20 text-red flex items-center justify-center text-[10px] font-bold">!</span>
                      {label}
                    </div>
                  ))}
                </div>
              )}
              {data.atsScore === 100 && (
                <p className="text-sm text-green">No formatting issues detected.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-text2">Run a check to see how your resume scores.</p>
          )}
          <Button
            variant="secondary" size="sm"
            onClick={handleCheck}
            disabled={checking}
          >
            {checking ? "Checking..." : wasChecked ? "Re-run Check" : "Run ATS Check"}
          </Button>
        </div>
      )}

      {/* ATS Version */}
      {hasResume && wasChecked && (
        <div className="p-4 bg-surface2 rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text2 uppercase tracking-wide">ATS-Optimized Version</span>
            {hasATS && (
              <span className={`text-xs font-semibold ${data.atsApproved ? "text-green" : "text-text2"}`}>
                {data.atsApproved ? "Active" : "Not active"}
              </span>
            )}
          </div>
          {!hasATS ? (
            <p className="text-sm text-text2">
              No ATS version generated yet.
              {(data.atsIssues?.length > 0) && " We can fix the issues above automatically."}
            </p>
          ) : (
            <p className="text-sm text-text2">
              {data.atsApproved
                ? "This version is submitted to employers. Clean format, same content."
                : "Generated. Review it, then activate to use it with employers."}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {hasATS && (
              <Button variant="secondary" size="sm" onClick={handleViewATS} disabled={generating}>
                {generating ? "Loading..." : "View ATS Resume"}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : hasATS ? "Regenerate" : "Generate ATS Version"}
            </Button>
            {hasATS && !data.atsApproved && (
              <Button size="sm" onClick={handleApprove} disabled={approving}>
                {approving ? "Saving..." : "Use ATS Version"}
              </Button>
            )}
            {hasATS && data.atsApproved && (
              <Button variant="secondary" size="sm" onClick={handleDecline} disabled={approving}>
                {approving ? "Saving..." : "Use Original Instead"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-text">ATS-Optimized Resume</h3>
                <p className="text-xs text-text2 mt-0.5">Same content · ATS-friendly format</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-text2 hover:text-text transition p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={previewUrl} className="w-full h-full" style={{ minHeight: "500px" }} title="ATS Resume" />
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-border">
              {!data.atsApproved ? (
                <Button onClick={handleApprove} disabled={approving}>
                  {approving ? "Saving..." : "Use This Version"}
                </Button>
              ) : (
                <Button variant="secondary" onClick={handleDecline} disabled={approving}>
                  {approving ? "Saving..." : "Switch Back to Original"}
                </Button>
              )}
              <Button variant="secondary" onClick={handleOpenEdit}>Edit</Button>
              <a
                href={previewUrl}
                download="resume_ats.pdf"
                className="text-sm text-accent hover:underline ml-auto"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-text">Edit Resume Text</h3>
                <p className="text-xs text-text2 mt-0.5">Edit and regenerate a new ATS PDF</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="text-text2 hover:text-text p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                disabled={regenerating}
                className="w-full h-96 border border-border rounded-xl p-3 text-sm font-mono bg-background text-text resize-none focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <Button onClick={handleRegenerateFromEdit} disabled={regenerating || !editText.trim()}>
                {regenerating ? "Regenerating..." : "Regenerate PDF"}
              </Button>
              <Button variant="secondary" onClick={() => setShowEdit(false)} disabled={regenerating}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
