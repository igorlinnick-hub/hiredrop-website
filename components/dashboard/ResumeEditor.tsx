"use client";

/**
 * Fix what the generator got wrong, in place.
 *
 * The resume we generate is read by Claude off the user's PDF, and it gets things
 * about their own life wrong — a misread date, a mangled employer, a name with the
 * middle initial glued on. Until now the only repair was to re-upload and regenerate,
 * which spends a daily AI slot and can reintroduce the same mistake.
 *
 * So this edits the STRUCTURE the PDF was rendered from, and saving re-renders
 * straight from it — no model in the loop. What the user types is what prints, and
 * what prints is what the tailoring reads at apply time.
 *
 * Deliberately a working surface, not a poster: this is a form someone came here to
 * correct something in, so it stays dense, legible, and on the theme tokens.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";

export interface ResumeJob {
  title: string;
  company: string;
  location: string;
  dates: string;
  bullets: string[];
}

export interface ResumeSchool {
  degree: string;
  school: string;
  year: string;
}

export interface ResumeStructure {
  name: string;
  title: string;
  contact: { phone: string; email: string; location: string; linkedin: string };
  summary: string;
  competencies: string[];
  experience: ResumeJob[];
  education: ResumeSchool[];
  certifications: string[];
  languages: string[];
  tech_skills: string[];
}

export const EMPTY_STRUCTURE: ResumeStructure = {
  name: "",
  title: "",
  contact: { phone: "", email: "", location: "", linkedin: "" },
  summary: "",
  competencies: [],
  experience: [],
  education: [],
  certifications: [],
  languages: [],
  tech_skills: [],
};

const FIELD =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text " +
  "placeholder:text-text2/60 focus:border-text2 focus:outline-none";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text2">{children}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border pt-5 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {children}
    </section>
  );
}

/** A list of one-line values (skills, certifications, languages) — add, edit, remove. */
function LineList({
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  const lastRef = useRef<HTMLInputElement>(null);
  const focusLast = useRef(false);

  useEffect(() => {
    if (focusLast.current) {
      lastRef.current?.focus();
      focusLast.current = false;
    }
  }, [items.length]);

  function add() {
    focusLast.current = true;
    onChange([...items, ""]);
  }

  return (
    <div className="space-y-2">
      {items.map((value, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            ref={i === items.length - 1 ? lastRef : undefined}
            className={FIELD}
            value={value}
            placeholder={placeholder}
            onChange={e => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
            onKeyDown={e => {
              // Enter adds the next one — typing a list shouldn't need the mouse.
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button
            type="button"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="flex-shrink-0 rounded-lg border border-border px-2 py-2 text-text2 transition hover:border-red hover:text-red"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm font-medium text-text underline underline-offset-2 hover:opacity-70">
        {addLabel}
      </button>
    </div>
  );
}

interface Props {
  initial: ResumeStructure;
  saving: boolean;
  error: string | null;
  onSave: (structure: ResumeStructure) => void;
  onClose: () => void;
}

export default function ResumeEditor({ initial, saving, error, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<ResumeStructure>(initial);
  const [dirty, setDirty] = useState(false);

  const set = useCallback(<K extends keyof ResumeStructure>(key: K, value: ResumeStructure[K]) => {
    setDirty(true);
    setDraft(prev => ({ ...prev, [key]: value }));
  }, []);

  const setJob = useCallback((i: number, patch: Partial<ResumeJob>) => {
    setDirty(true);
    setDraft(prev => ({
      ...prev,
      experience: prev.experience.map((job, j) => (j === i ? { ...job, ...patch } : job)),
    }));
  }, []);

  // Closing with unsaved text in the form is the one thing that would make this worse
  // than re-generating, so Escape asks first.
  const tryClose = useCallback(() => {
    if (saving) return;
    if (dirty && !window.confirm("Close without saving? Your changes will be lost.")) return;
    onClose();
  }, [dirty, onClose, saving]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") tryClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave(draft);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, onSave, tryClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit resume"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-text">Edit your resume</h2>
            <p className="mt-1 text-sm text-text2">
              Corrections print exactly as you type them — nothing is rewritten. This is also the version
              we tailor when you apply.
            </p>
          </div>
          <button
            type="button"
            onClick={tryClose}
            aria-label="Close"
            className="flex-shrink-0 rounded-lg p-1.5 text-text2 transition hover:bg-surface2 hover:text-text"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <Section title="Header">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <Label>Full name</Label>
                <input className={FIELD} value={draft.name} onChange={e => set("name", e.target.value)} placeholder="Jane Roe" />
              </label>
              <label className="block">
                <Label>Professional title</Label>
                <input className={FIELD} value={draft.title} onChange={e => set("title", e.target.value)} placeholder="Registered Nurse" />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(["email", "phone", "location", "linkedin"] as const).map(key => (
                <label key={key} className="block">
                  <Label>{key}</Label>
                  <input
                    className={FIELD}
                    value={draft.contact[key]}
                    onChange={e => set("contact", { ...draft.contact, [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
          </Section>

          <Section title="Summary">
            <textarea
              className={`${FIELD} min-h-[90px] resize-y`}
              value={draft.summary}
              onChange={e => set("summary", e.target.value)}
              placeholder="Two or three lines on what you do and how long you've done it."
            />
          </Section>

          <Section title="Core competencies">
            <LineList
              items={draft.competencies}
              onChange={v => set("competencies", v)}
              placeholder="Triage"
              addLabel="+ Add competency"
            />
          </Section>

          <Section title="Experience">
            <div className="space-y-4">
              {draft.experience.map((job, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-border bg-surface2/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text2">Job {i + 1}</p>
                    <button
                      type="button"
                      onClick={() => set("experience", draft.experience.filter((_, j) => j !== i))}
                      className="text-xs font-medium text-text2 underline underline-offset-2 hover:text-red"
                    >
                      Remove job
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input className={FIELD} value={job.title} onChange={e => setJob(i, { title: e.target.value })} placeholder="Job title" />
                    <input className={FIELD} value={job.company} onChange={e => setJob(i, { company: e.target.value })} placeholder="Company" />
                    <input className={FIELD} value={job.location} onChange={e => setJob(i, { location: e.target.value })} placeholder="City, State" />
                    <input className={FIELD} value={job.dates} onChange={e => setJob(i, { dates: e.target.value })} placeholder="Mar 2020 – Present" />
                  </div>
                  <div>
                    <Label>What you did</Label>
                    <LineList
                      items={job.bullets}
                      onChange={v => setJob(i, { bullets: v })}
                      placeholder="Ran a 24-bed unit across night shifts"
                      addLabel="+ Add bullet"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  set("experience", [...draft.experience, { title: "", company: "", location: "", dates: "", bullets: [] }])
                }
                className="text-sm font-medium text-text underline underline-offset-2 hover:opacity-70"
              >
                + Add job
              </button>
            </div>
          </Section>

          <Section title="Education">
            <div className="space-y-3">
              {draft.education.map((e, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      className={FIELD}
                      value={e.degree}
                      placeholder="Degree"
                      onChange={ev => set("education", draft.education.map((x, j) => (j === i ? { ...x, degree: ev.target.value } : x)))}
                    />
                    <input
                      className={FIELD}
                      value={e.school}
                      placeholder="School"
                      onChange={ev => set("education", draft.education.map((x, j) => (j === i ? { ...x, school: ev.target.value } : x)))}
                    />
                    <input
                      className={FIELD}
                      value={e.year}
                      placeholder="Year"
                      onChange={ev => set("education", draft.education.map((x, j) => (j === i ? { ...x, year: ev.target.value } : x)))}
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => set("education", draft.education.filter((_, j) => j !== i))}
                    className="flex-shrink-0 rounded-lg border border-border px-2 py-2 text-text2 transition hover:border-red hover:text-red"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set("education", [...draft.education, { degree: "", school: "", year: "" }])}
                className="text-sm font-medium text-text underline underline-offset-2 hover:opacity-70"
              >
                + Add education
              </button>
            </div>
          </Section>

          <Section title="Certifications">
            <LineList items={draft.certifications} onChange={v => set("certifications", v)} placeholder="BLS" addLabel="+ Add certification" />
          </Section>

          <Section title="Technical skills">
            <LineList items={draft.tech_skills} onChange={v => set("tech_skills", v)} placeholder="Epic" addLabel="+ Add skill" />
          </Section>

          <Section title="Languages">
            <LineList items={draft.languages} onChange={v => set("languages", v)} placeholder="English (native)" addLabel="+ Add language" />
          </Section>
        </div>

        <footer className="space-y-3 border-t border-border px-6 py-4">
          {error && <p className="text-sm text-red">{error}</p>}
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-text2">
              Saving rebuilds your PDF and Word file. Your ATS score is re-checked after, since it was
              measured on the old version.
            </p>
            <div className="flex flex-shrink-0 items-center gap-3">
              <Button variant="ghost" size="sm" onClick={tryClose} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => onSave(draft)} disabled={saving}>
                {saving ? "Saving…" : "Save & rebuild"}
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
