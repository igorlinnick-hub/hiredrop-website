"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import ResumeFileRow from "./ResumeFileRow";
import SkillsCard from "./SkillsCard";
import SkillsModal, { MIN_SKILLS, SKILLS_EXAMPLE, countSkills } from "./SkillsModal";

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

type ResumeChoice = "original" | "ats" | "skills";

interface ATSData {
  atsScore: number | null;
  atsIssues: string[];
  atsIssueLabels: string[];
  atsResumeUrl: string | null;
  atsApproved: boolean;
  atsCheckedAt: string | null;
  resumeUrl: string | null;
  skillsResumeUrl: string | null;
  // The explicit dial (profiles.default_resume). null = legacy: atsApproved decides.
  defaultResume: ResumeChoice | null;
  // The user's own words about their skills (persisted) + the generated grouping.
  skillsDescription: string;
  skillGroups: { group: string; skills: string[] }[];
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

  const [data, setData] = useState<ATSData>({
    atsScore: null, atsIssues: [], atsIssueLabels: [], atsResumeUrl: null,
    atsApproved: false, atsCheckedAt: null, resumeUrl: null,
    skillsResumeUrl: null, defaultResume: null, skillsDescription: "", skillGroups: [],
  });
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<"ats" | "original" | "skills">("ats");
  const [skillsGenerating, setSkillsGenerating] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [skillsDraft, setSkillsDraft] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);
  // Errors from inside the skills modal belong inside it — the panel-level banner
  // would be hidden behind the overlay the user is still looking at.
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<QA[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
          skillsResumeUrl: p.skills_resume_url || null,
          defaultResume: p.default_resume || null,
          skillsDescription: p.skills_description || "",
          skillGroups: p.skill_groups || [],
        });
      }
      setLoading(false);

      // Deep link from the setup checklist ("List your skills"). Settings is a long
      // page and this panel sits at the bottom, so landing at the top looked like
      // the feature wasn't there. Arriving with #skills means the user asked for
      // exactly this box: scroll to it and open it, pre-filled with what they saved.
      if (window.location.hash === "#skills") {
        setSkillsDraft(p?.skills_description || "");
        setShowSkillsModal(true);
        requestAnimationFrame(() =>
          document.getElementById("skills")?.scrollIntoView({ block: "center" })
        );
      }
    }
    load();
  }, [supabase]);

  async function uploadResume(file: File) {
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
    if (previewUrl && previewKind === "ats") { setShowPreview(true); return; }
    setLoadingView(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/ats/resume/url", token);
      setPreviewUrl(result.url);
      setPreviewKind("ats");
      try {
        const docx = await apiCall("/profile/ats/resume/docx-url", token);
        setDocxUrl(docx.url || null);
      } catch { setDocxUrl(null); }
      setShowPreview(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load ATS resume");
    }
    setLoadingView(false);
  }

  async function handleViewOriginal() {
    setLoadingView(true);
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
    setLoadingView(false);
  }

  // Fetch a signed URL for the given resume file and trigger a direct download.
  async function downloadFile(endpoint: string, filename: string) {
    setDownloading(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall(endpoint, token);
      if (!result.url) throw new Error("File not available");
      const a = document.createElement("a");
      a.href = result.url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
    setDownloading(false);
  }

  async function handleViewSkills() {
    if (previewUrl && previewKind === "skills") { setShowPreview(true); return; }
    setLoadingView(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/resume/skills/url", token);
      setPreviewUrl(result.url);
      setPreviewKind("skills");
      try {
        const docx = await apiCall("/profile/resume/skills/docx-url", token);
        setDocxUrl(docx.url || null);
      } catch { setDocxUrl(null); }
      setShowPreview(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load skills resume");
    }
    setLoadingView(false);
  }

  // Opens the describe-your-skills step first — the user's words are the input
  // that makes the second resume theirs, and they persist to the profile.
  function handleOpenSkills() {
    setSkillsDraft(data.skillsDescription);
    setSkillsError(null);
    setShowSkillsModal(true);
  }

  async function handleSaveSkillsOnly() {
    setSavingSkills(true);
    setSkillsError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/skills/describe", token, "POST", {
        description: skillsDraft,
      });
      setData(prev => ({ ...prev, skillsDescription: result.skills_description || "" }));
      setShowSkillsModal(false);
      flash("Skills saved to your profile.");
    } catch (e: unknown) {
      setSkillsError(e instanceof Error ? e.message : "Could not save skills");
    }
    setSavingSkills(false);
  }

  async function handleGenerateSkills() {
    setSkillsGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiCall("/profile/resume/skills/generate", token, "POST", {
        description: skillsDraft,
      });
      setData(prev => ({
        ...prev,
        skillsResumeUrl: result.skills_resume_url || null,
        skillsDescription: skillsDraft.trim(),
        skillGroups: result.skill_groups || prev.skillGroups,
      }));
      // Only now: a failed generation must leave the typed list on screen, not
      // dump the user back to a closed modal with their words seemingly gone.
      setShowSkillsModal(false);
      if (result.preview_url) {
        setPreviewUrl(result.preview_url);
        setDocxUrl(result.docx_url || null);
        setPreviewKind("skills");
        setShowPreview(true);
      }
      flash("Skills resume generated — review it, then make it your default if you like it.");
    } catch (e: unknown) {
      setSkillsError(e instanceof Error ? e.message : "Could not generate skills resume");
    }
    setSkillsGenerating(false);
  }

  // ONE dial for which resume applications use. The legacy ats_approved flag is
  // kept in sync so older surfaces (and the null-dial fallback) never disagree.
  async function handleSetDefault(choice: ResumeChoice) {
    setApproving(true);
    setError(null);
    try {
      const token = await getToken();
      await apiCall("/profile/resume/default", token, "POST", { choice });
      await apiCall(choice === "ats" ? "/profile/ats/approve" : "/profile/ats/decline", token, "POST")
        .catch(() => { /* legacy sync is best-effort */ });
      setData(prev => ({ ...prev, defaultResume: choice, atsApproved: choice === "ats" }));
      setShowPreview(false);
      flash(
        choice === "original"
          ? "Original resume is now your default."
          : choice === "ats"
            ? "ATS version is now your default — will be sent to employers."
            : "Skills version is now your default — will be sent to employers."
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
    setApproving(false);
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  if (loading) return (
    <section className="hd-panel p-6">
      <div className="animate-pulse h-4 w-40 bg-surface2 rounded" />
    </section>
  );

  const hasResume = !!data.resumeUrl;
  const hasATS = !!data.atsResumeUrl;
  const hasSkills = !!data.skillsResumeUrl;
  const skillCount = countSkills(skillsDraft);
  // What applying actually uses: the dial when set, legacy atsApproved otherwise.
  const effectiveDefault: ResumeChoice = data.defaultResume ?? (data.atsApproved ? "ats" : "original");
  const wasChecked = data.atsScore !== null;
  // A resume "passes" only with no design blockers AND a score over threshold.
  // Design blocks (columns/tables/images/floating blocks) force regeneration.
  const STRUCTURAL_ISSUES = ["columns", "tables", "images", "text_boxes"];
  const hasStructural = data.atsIssues.some(i => STRUCTURAL_ISSUES.includes(i));
  const passes = wasChecked && !hasStructural && (data.atsScore ?? 0) >= ATS_PASS_THRESHOLD;

  return (
    <>
    <section className="hd-panel p-6 space-y-5">

      {/* Header + active badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text">Resume & ATS</h3>
          <p className="text-xs text-text2 mt-0.5">Manage which version employers receive.</p>
        </div>
        {hasResume && (
          <div className={[
            "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0",
            effectiveDefault !== "original"
              ? "bg-green/10 border-green text-green"
              : "bg-surface2 border-border text-text2",
          ].join(" ")}>
            <span className={`w-1.5 h-1.5 rounded-full ${effectiveDefault !== "original" ? "bg-green" : "bg-text2"}`} />
            {effectiveDefault === "ats" ? "ATS version active" : effectiveDefault === "skills" ? "Skills version active" : "Original active"}
          </div>
        )}
      </div>

      {error && <div className="p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">{error}</div>}
      {successMsg && <div className="p-3 rounded-lg bg-green/10 border border-green/20 text-green text-sm">{successMsg}</div>}

      {/* What employers actually receive — single source of truth */}
      {hasResume && (
        <div className="rounded-xl border border-border bg-surface2/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-text/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text2">Base resume for applications</p>
              <p className="text-sm font-semibold text-text">
                {effectiveDefault === "ats"
                  ? "Your ATS-optimized resume"
                  : effectiveDefault === "skills"
                    ? "Your skills-first resume"
                    : "Your original resume"}
              </p>
              <p className="text-xs text-text2 mt-0.5">Tailored to strong-match roles when you apply.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={
                effectiveDefault === "ats"
                  ? handleViewATS
                  : effectiveDefault === "skills"
                    ? handleViewSkills
                    : handleViewOriginal
              }
              disabled={loadingView}
            >
              {loadingView ? "Loading…" : "View"}
            </Button>
          </div>

          {/* Direct downloads */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <span className="text-xs text-text2">{downloading ? "Preparing…" : "Download"}</span>
            <button
              onClick={() =>
                downloadFile(
                  effectiveDefault === "ats"
                    ? "/profile/ats/resume/url"
                    : effectiveDefault === "skills"
                      ? "/profile/resume/skills/url"
                      : "/profile/resume/url",
                  effectiveDefault === "ats"
                    ? "resume_ats.pdf"
                    : effectiveDefault === "skills"
                      ? "resume_skills.pdf"
                      : "resume.pdf"
                )
              }
              disabled={downloading}
              className="text-sm font-medium text-text underline underline-offset-2 hover:opacity-70 disabled:opacity-50"
            >
              PDF
            </button>
            {effectiveDefault === "ats" && hasATS && (
              <button
                onClick={() => downloadFile("/profile/ats/resume/docx-url", "resume_ats.docx")}
                disabled={downloading}
                className="text-sm font-medium text-text underline underline-offset-2 hover:opacity-70 disabled:opacity-50"
              >
                Word (.docx)
              </button>
            )}
            {effectiveDefault === "skills" && hasSkills && (
              <button
                onClick={() => downloadFile("/profile/resume/skills/docx-url", "resume_skills.docx")}
                disabled={downloading}
                className="text-sm font-medium text-text underline underline-offset-2 hover:opacity-70 disabled:opacity-50"
              >
                Word (.docx)
              </button>
            )}
          </div>
        </div>
      )}

      <ResumeFileRow
        hasResume={hasResume}
        uploading={uploading}
        onFile={uploadResume}
        onReject={setError}
      />

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
              <span className={`text-xs font-semibold ${effectiveDefault === "ats" ? "text-green" : "text-text2"}`}>
                {effectiveDefault === "ats" ? "Active" : "Not active"}
              </span>
            )}
          </div>

          <p className="text-sm text-text2">
            {hasATS
              ? effectiveDefault === "ats"
                ? "This clean version is your baseline — then tailored to each job when you apply."
                : "Generated. Activate it to make it your baseline."
              : "We'll ask you a few quick questions, then generate a clean version."}
          </p>

          <div className="flex flex-wrap gap-2">
            {hasATS && (
              <Button variant="secondary" size="sm" onClick={handleViewATS} disabled={loadingView || generating}>
                {loadingView ? "Loading…" : "View"}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleOpenQA} disabled={generating || loadingView}>
              {generating ? "Generating…" : hasATS ? "Regenerate" : "Generate ATS Version"}
            </Button>
            {hasATS && effectiveDefault !== "ats" && (
              <Button size="sm" onClick={() => handleSetDefault("ats")} disabled={approving}>
                {approving ? "Saving…" : "Use ATS Version"}
              </Button>
            )}
            {hasATS && effectiveDefault === "ats" && (
              <Button variant="secondary" size="sm" onClick={() => handleSetDefault("original")} disabled={approving}>
                {approving ? "Saving…" : "Use Original"}
              </Button>
            )}
          </div>
          <p className="text-xs text-text2">To change content — upload a new resume and regenerate.</p>
        </div>
      )}

      </section>

      {/* Skills-First Version sits OUTSIDE the monochrome panel on purpose: the page
          alternates black-and-white panel, picture, panel, picture (Igor, 09-20), and
          a poster framed inside a white card breaks that rhythm. */}
      {hasResume && (
        <SkillsCard
          hasSkills={hasSkills}
          isDefault={effectiveDefault === "skills"}
          groups={data.skillGroups}
          busy={skillsGenerating || loadingView}
          onView={handleViewSkills}
          onEdit={handleOpenSkills}
          onMakeDefault={() => handleSetDefault("skills")}
          onUseOriginal={() => handleSetDefault("original")}
          viewing={loadingView}
          generating={skillsGenerating}
          saving={approving}
        />
      )}

      {/* Describe-your-skills modal — the words persist to the profile either way */}
      <SkillsModal
        open={showSkillsModal}
        value={skillsDraft}
        onChange={setSkillsDraft}
        onClose={() => setShowSkillsModal(false)}
        onSave={handleSaveSkillsOnly}
        onGenerate={handleGenerateSkills}
        saving={savingSkills}
        generating={skillsGenerating}
        error={skillsError}
        hasResume={hasResume}
        skillCount={skillCount}
        minSkills={MIN_SKILLS}
        example={SKILLS_EXAMPLE}
      />

      {/* Q&A Modal */}
      {showQA && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h3 className="font-semibold text-text">A few quick questions</h3>
                <p className="text-xs text-text2 mt-0.5">ATS searches for exact tool names. Your answers go directly into Technical Skills — the section ATS scans first.</p>
              </div>
              <button onClick={() => setShowQA(false)} className="text-text2 hover:text-text p-1 ml-4 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
              <Button variant="secondary" onClick={() => setShowQA(false)}>
                Cancel
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
                  {previewKind === "ats"
                    ? "ATS-Optimized Resume"
                    : previewKind === "skills"
                      ? "Skills-First Resume"
                      : "Your Current Resume"}
                </h3>
                <p className="text-xs text-text2 mt-0.5">
                  {previewKind === "ats"
                    ? "Same content · ATS-safe format"
                    : previewKind === "skills"
                      ? "Grouped skills lead · compact work history"
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
              {/* Make-default actions only make sense for the generated versions */}
              {previewKind !== "original" && (
                effectiveDefault !== previewKind ? (
                  <Button onClick={() => handleSetDefault(previewKind)} disabled={approving}>
                    {approving ? "Saving…" : "Use This Version"}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => handleSetDefault("original")} disabled={approving}>
                    {approving ? "Saving…" : "Use Original Instead"}
                  </Button>
                )
              )}
              <div className="ml-auto flex items-center gap-3">
                <a
                  href={previewUrl}
                  download={
                    previewKind === "ats"
                      ? "resume_ats.pdf"
                      : previewKind === "skills"
                        ? "resume_skills.pdf"
                        : "resume.pdf"
                  }
                  className="text-sm text-accent hover:underline"
                >
                  Download PDF
                </a>
                {previewKind !== "original" && docxUrl && (
                  <a
                    href={docxUrl}
                    download={previewKind === "ats" ? "resume_ats.docx" : "resume_skills.docx"}
                    className="text-sm text-accent hover:underline"
                  >
                    Download Word
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
