"use client";

import SkillsCard from "@/components/dashboard/SkillsCard";

// The real card, in its generated state — the second picture in the rhythm.
export default function SettingsPreviewClient() {
  return (
    <SkillsCard
      hasSkills
      isDefault
      groups={[
        { group: "Customer Support", skills: ["Zendesk", "De-escalation", "Help-center writing"] },
        { group: "Data & Tools", skills: ["Excel", "Google Sheets", "Shopify admin"] },
        { group: "Team", skills: ["Training new hires", "Shift scheduling"] },
      ]}
      busy={false}
      onView={() => {}}
      onEdit={() => {}}
      onMakeDefault={() => {}}
      onUseOriginal={() => {}}
      viewing={false}
      generating={false}
      saving={false}
    />
  );
}
