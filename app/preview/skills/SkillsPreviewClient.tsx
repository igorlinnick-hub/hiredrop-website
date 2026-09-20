"use client";

import { useState } from "react";

import SkillsCard from "@/components/dashboard/SkillsCard";
import SkillsModal, {
  MIN_SKILLS,
  SKILLS_EXAMPLE,
  countSkills,
} from "@/components/dashboard/SkillsModal";

// The real component, wired to local state so typing, the counter and the
// enable/disable on the primary CTA all behave exactly as they do in the app.
export default function SkillsPreviewClient({ dark }: { dark: boolean }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <div className={["min-h-screen bg-background hd-dash-root", dark ? "dark" : ""].join(" ")}>
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-12">
        {/* The Settings card, in the two states it ships in */}
        <SkillsCard
          hasSkills={false} isDefault={false} groups={[]} busy={false}
          onView={() => {}} onEdit={() => setOpen(true)}
          onMakeDefault={() => {}} onUseOriginal={() => {}}
          viewing={false} generating={false} saving={false}
        />
        <SkillsCard
          hasSkills isDefault
          groups={[
            { group: "Customer Support", skills: ["Zendesk", "De-escalation", "Help-center writing"] },
            { group: "Data & Tools", skills: ["Excel", "Google Sheets", "Shopify admin"] },
            { group: "Team", skills: ["Training new hires", "Shift scheduling"] },
          ]}
          busy={false} onView={() => {}} onEdit={() => setOpen(true)}
          onMakeDefault={() => {}} onUseOriginal={() => {}}
          viewing={false} generating={false} saving={false}
        />
        {/* A neighbouring mono panel, so the contrast between them is reviewable */}
        <section className="hd-panel p-6 space-y-2">
          <h3 className="font-semibold text-text">Personal Information</h3>
          <p className="text-sm text-text2">The monochrome panel treatment next to the dark card.</p>
        </section>
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
