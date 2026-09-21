"use client";

import { useRef } from "react";
import Button from "@/components/ui/Button";
import { useFileDrop, resumeRejectReason } from "@/lib/useFileDrop";

interface Props {
  hasResume: boolean;
  uploading: boolean;
  /** Receives a file that already passed validation. */
  onFile: (file: File) => void;
  /** Where a refusal goes — the panel's existing error banner. */
  onReject: (message: string) => void;
}

/**
 * The resume row in Settings, and the drop target for it: on a Mac the file is one
 * drag away in Finder, so requiring the picker was an extra dialog for no reason.
 * Lives apart from ResumeATSPanel so /preview/resume-drop reviews the real row.
 */
export default function ResumeFileRow({ hasResume, uploading, onFile, onReject }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const drop = useFileDrop({ onFile, onReject, disabled: uploading, guardWindow: true });

  function handlePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file twice still fires a change
    if (!file) return;
    const reason = resumeRejectReason(file);
    if (reason) { onReject(reason); return; }
    onFile(file);
  }

  return (
    <div
      {...drop.dropProps}
      data-testid="resume-drop-row"
      className={[
        "flex items-center gap-3 p-4 rounded-xl border transition",
        drop.isOver
          ? "border-dashed border-accent bg-accent/5"
          : drop.isReject
            ? "border-dashed border-red bg-red/5"
            : "border-border bg-surface2",
      ].join(" ")}
    >
      <div className={[
        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition",
        drop.isReject ? "bg-red/10" : "bg-accent/10",
      ].join(" ")}>
        {/* the icon carries the state while a file is in the air */}
        <svg className={`w-5 h-5 ${drop.isReject ? "text-red" : "text-text"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {drop.isOver ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          ) : drop.isReject ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636L5.636 18.364M12 3a9 9 0 110 18 9 9 0 010-18z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          )}
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text">
          {drop.isOver
            ? hasResume ? "Drop to replace your resume" : "Drop to upload your resume"
            : hasResume ? "resume.pdf" : "No resume uploaded"}
        </p>
        <p className={`text-xs ${drop.isReject ? "text-red" : "text-text2"}`}>
          {drop.isReject
            ? drop.hint
            : drop.isOver
              ? "PDF, up to 10 MB"
              : hasResume
                ? "Drag a new PDF here, or press Replace"
                : "Drag a PDF here, or press Upload — enables auto-apply"}
        </p>
      </div>

      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handlePicked} className="hidden" />
      <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? "Uploading…" : hasResume ? "Replace" : "Upload"}
      </Button>
    </div>
  );
}
