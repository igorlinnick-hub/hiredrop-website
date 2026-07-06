"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { LOCATIONS, JOB_TYPES } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

interface Props {
  profile: UserProfile;
  resumeFile: File | null;
  onBack: () => void;
  onFinish: () => void;
  saving?: boolean;
}

/**
 * Personalized "set up the safe way" payoff screen.
 *
 * Replaces the old dry summary table. Echoes the user's own answers back into a
 * 3-step plan (Sprout's aha pattern) but framed around OUR positioning: find →
 * tailor → apply from your browser, you review first. Reinforces ban-safe at the
 * finish line, then routes to the extension + dashboard.
 */
export default function StepDone({ profile, resumeFile, onBack, onFinish, saving }: Props) {
  const locationLabel = LOCATIONS.find((l) => l.value === profile.location)?.label || profile.location;
  const jobTypeLabel = JOB_TYPES.find((j) => j.value === profile.job_type)?.label || profile.job_type;
  const firstName = profile.name?.trim() || "there";
  const keywords =
    profile.keywords.length > 0 ? profile.keywords.slice(0, 3).join(", ") : "matching";

  const plan = [
    {
      n: 1,
      title: "Find the right roles",
      body: (
        <>
          We&apos;ll surface <strong className="text-text">{keywords}</strong> roles in{" "}
          <strong className="text-text">{locationLabel}</strong> ({jobTypeLabel}), ranked to your profile.
        </>
      ),
    },
    {
      n: 2,
      title: "Tailor every application",
      body: (
        <>
          A fresh resume and cover letter written for each role — in your voice, never a generic blast.
        </>
      ),
    },
    {
      n: 3,
      title: "Apply — the safe way",
      body: (
        <>
          Applications go out from <strong className="text-text">your own browser</strong>, at a human pace.
          You review before anything sends.
        </>
      ),
    },
  ];

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-7">
      <motion.div variants={item} className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-full bg-green/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text">You&apos;re set up, {firstName}.</h2>
        <p className="text-sm text-text2 max-w-md mx-auto">
          Here&apos;s exactly what HireDrop will do for you — safely, and always with you in control.
        </p>
      </motion.div>

      {/* Personalized 3-step plan */}
      <motion.div variants={container} className="space-y-3">
        {plan.map((s) => (
          <motion.div
            key={s.n}
            variants={item}
            className="flex items-start gap-4 p-4 rounded-xl bg-surface2 border border-border"
          >
            <div className="shrink-0 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold">
              {s.n}
            </div>
            <div>
              <p className="font-semibold text-text text-sm">{s.title}</p>
              <p className="text-sm text-text2 mt-0.5">{s.body}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Compact recap */}
      <motion.div variants={item} className="rounded-xl border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text2 mb-3">Your profile</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Recap label="Keywords" value={profile.keywords.join(", ") || "—"} />
          <Recap label="Location" value={locationLabel} />
          <Recap label="Job type" value={jobTypeLabel} />
          <Recap label="Resume" value={resumeFile ? resumeFile.name : "Add later"} />
        </div>
      </motion.div>

      <motion.div variants={item} className="flex justify-between items-center pt-1">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <div className="flex gap-3">
          <Button variant="secondary" href="/extension">Install Extension</Button>
          <Button onClick={onFinish} disabled={saving}>
            {saving ? "Saving..." : "Go to Dashboard"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-text2 text-xs">{label}</span>
      <span className="block text-text font-medium truncate">{value}</span>
    </div>
  );
}
