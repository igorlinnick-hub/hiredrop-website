"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { LOCATIONS, JOB_TYPES } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

interface Props {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepJobPreferences({ profile, updateProfile, onNext, onBack }: Props) {
  const [keywordInput, setKeywordInput] = useState("");

  function addKeyword(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const word = keywordInput.trim().replace(/,$/,"");
      if (word && !profile.keywords.includes(word)) {
        updateProfile({ keywords: [...profile.keywords, word] });
      }
      setKeywordInput("");
    }
  }

  function removeKeyword(keyword: string) {
    updateProfile({ keywords: profile.keywords.filter((k) => k !== keyword) });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Commit any keyword still sitting in the input so a typed-but-not-Entered
    // word (e.g. "Marketing") doesn't silently block Continue.
    let keywords = profile.keywords;
    const pending = keywordInput.trim().replace(/,$/, "");
    if (pending && !keywords.includes(pending)) {
      keywords = [...keywords, pending];
      updateProfile({ keywords });
      setKeywordInput("");
    }
    if (keywords.length === 0) return;
    // Both eligibility answers are required. Unset is not a neutral default here: it
    // means every form carrying these questions gets handed back mid-run.
    if (profile.work_authorized_us === null || profile.needs_sponsorship === null) return;
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">Job Preferences</h2>
        <p className="text-sm text-text2 mt-1">Tell us what kind of jobs you&apos;re looking for.</p>
      </div>

      {/* Keywords */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">
          Keywords <span className="text-red">*</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {profile.keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-3 py-1 bg-accent/10 text-accent text-sm rounded-full"
            >
              {kw}
              <button
                type="button"
                onClick={() => removeKeyword(kw)}
                className="hover:text-red transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <Input
          name="keyword_input"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={addKeyword}
          placeholder="Type a keyword and press Enter (e.g. marketing, react, sales)"
          hint={profile.keywords.length === 0 ? "Add at least one keyword." : `${profile.keywords.length} keyword(s) added.`}
        />
      </div>

      <Select
        label="Location"
        name="location"
        value={profile.location}
        onChange={(e) => updateProfile({ location: e.target.value })}
        options={LOCATIONS.map((l) => ({ value: l.value, label: l.label }))}
        required
      />

      {/* Job Type — selectable option cards */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">
          Job type <span className="text-red">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {JOB_TYPES.map((jt) => {
            const selected = profile.job_type === jt.value;
            return (
              <button
                key={jt.value}
                type="button"
                onClick={() => updateProfile({ job_type: jt.value })}
                aria-pressed={selected}
                className={[
                  "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition text-center",
                  selected
                    ? "border-accent bg-accent-light text-accent"
                    : "border-border bg-surface text-text hover:border-accent hover:bg-accent-light/40",
                ].join(" ")}
              >
                {selected && (
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {jt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Work eligibility — asked HERE, in onboarding, because the answer is a
          knockout on nearly every application form and nothing may guess it.

          The two fields have existed in the database and in Settings for months and
          were set on 3 of 37 profiles (measured 09-21): nobody scrolls to the middle
          of Settings to fill in something no screen ever asked for. Meanwhile the
          screener answerer was reaching them as unset and the model answered anyway
          — "No, sponsorship not required" off a US address — filing a guess about
          someone's legal status under their name. The backend now refuses to guess
          (HireDrop #228), which turns an unset field into a form handed back to the
          human. That is honest but it stalls the run, so the real fix is asking once,
          here, while the person is already answering questions about themselves. */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text">
          Work eligibility <span className="text-red">*</span>
        </label>
        <p className="text-xs text-text2">
          Almost every application asks these two. We never guess them — an unanswered
          one stops the application and waits for you.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <YesNo
            question="Authorized to work in the country you're applying in?"
            value={profile.work_authorized_us}
            onChange={(v) => updateProfile({ work_authorized_us: v })}
          />
          <YesNo
            question="Will you need visa sponsorship?"
            value={profile.needs_sponsorship}
            onChange={(v) => updateProfile({ needs_sponsorship: v })}
          />
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}

/** A two-button yes/no. A <select> with a "Select…" placeholder is how these two
 *  ended up unanswered on 34 of 37 profiles — an untouched dropdown looks the same
 *  as a considered one. Two buttons make the unanswered state visible. */
function YesNo({
  question,
  value,
  onChange,
}: {
  question: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[13px] text-text leading-snug mb-2.5">{question}</p>
      <div className="flex gap-2">
        {[
          { label: "Yes", v: true },
          { label: "No", v: false },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={value === o.v}
            className={[
              "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition active:scale-[.98]",
              value === o.v
                ? "border-accent bg-accent-light text-accent"
                : "border-border bg-surface text-text2 hover:border-accent hover:text-text",
            ].join(" ")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
