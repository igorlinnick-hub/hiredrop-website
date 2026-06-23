"use client";

import { useRef } from "react";
import Button from "@/components/ui/Button";

interface Props {
  resumeFile: File | null;
  setResumeFile: (file: File | null) => void;
  onNext: () => void;
  onBack: () => void;
  uploading?: boolean;
}

export default function StepResume({ resumeFile, setResumeFile, onNext, onBack, uploading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setResumeFile(file);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setResumeFile(file);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resumeFile) return;
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">Upload Resume</h2>
        <p className="text-sm text-text2 mt-1">
          Your resume is used for auto-applying and as context for AI cover letters.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={[
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition",
          resumeFile
            ? "border-green bg-green/5"
            : "border-border hover:border-accent hover:bg-accent/5",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleFile}
          className="hidden"
        />

        {resumeFile ? (
          <div className="space-y-2">
            <svg className="w-10 h-10 mx-auto text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-text">{resumeFile.name}</p>
            <p className="text-sm text-text2">
              {(resumeFile.size / 1024).toFixed(0)} KB
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setResumeFile(null);
              }}
              className="text-sm text-red hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <svg className="w-10 h-10 mx-auto text-text2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-text2">
              <span className="text-accent font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-text2">PDF only, max 10 MB</p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={!resumeFile || uploading}>
          {uploading ? "Uploading..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}
