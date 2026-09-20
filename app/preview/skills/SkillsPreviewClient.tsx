"use client";

import { useState } from "react";

import SkillsModal, {
  MIN_SKILLS,
  SKILLS_EXAMPLE,
  countSkills,
} from "@/components/dashboard/SkillsModal";

// The real component, wired to local state so typing, the counter and the
// enable/disable on the primary CTA all behave exactly as they do in the app.
export default function SkillsPreviewClient({ dark }: { dark: boolean }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(true);

  return (
    <div className={["min-h-screen bg-background hd-dash-root", dark ? "dark" : ""].join(" ")}>
      <div className="flex min-h-screen items-center justify-center">
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-text"
        >
          Open the dialog
        </button>
      </div>

      <SkillsModal
        open={open}
        value={value}
        onChange={setValue}
        onClose={() => setOpen(false)}
        onSave={() => setOpen(false)}
        onGenerate={() => setOpen(false)}
        saving={false}
        generating={false}
        error={null}
        hasResume
        skillCount={countSkills(value)}
        minSkills={MIN_SKILLS}
        example={SKILLS_EXAMPLE}
      />
    </div>
  );
}
