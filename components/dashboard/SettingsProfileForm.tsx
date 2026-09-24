"use client";

/**
 * The two profile sections of Settings, split by WHO ASKS for the field:
 *
 *   <AccountFields>  — who you are: name, e-mail, phone, your links.
 *   <FormFields>     — what an application form asks about you: current
 *                      employment, mailing address, work eligibility.
 *
 * They were one 130-line block before (Igor 09-23: «куча всего намешано»).
 * Splitting them is not cosmetic: the second group exists only because forms
 * demand it — "current employer" and a ZIP are the biggest hand-back causes —
 * and saying that next to the fields is what makes filling them worth doing.
 *
 * Presentational on purpose: the page owns the profile, the save and the
 * loading state, so the same markup renders on /preview/settings-rail without
 * a session.
 *
 * 09-24, Igor: «минималистичнее, убирай лишние слова». Every explanatory line
 * under a heading and every field hint is gone — a heading plus its fields.
 * Format examples live in placeholders, where they don't add a line of text.
 */

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import type { UserProfile } from "@/lib/types";

type Props = {
  profile: UserProfile;
  update: (u: Partial<UserProfile>) => void;
  /** The section's own save bar — rendered at the bottom of each card. */
  saveBar: () => React.ReactNode;
};

export function AccountFields({ profile, update, saveBar }: Props) {
  return (
    <div className="hd-sheet p-5 sm:p-6 space-y-4">
      <h3 className="hd-hist-sub-head">Who you are</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="First name" value={profile.name} onChange={(e) => update({ name: e.target.value })} />
        <Input label="Last name" value={profile.last_name} onChange={(e) => update({ last_name: e.target.value })} />
      </div>
      <Input label="Email" type="email" value={profile.email} disabled />
      <Input label="Phone" type="tel" value={profile.phone} onChange={(e) => update({ phone: e.target.value })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="LinkedIn URL" type="url" value={profile.linkedin_url}
          onChange={(e) => update({ linkedin_url: e.target.value })} />
        <Input label="Portfolio / website URL" type="url" value={profile.portfolio_url}
          onChange={(e) => update({ portfolio_url: e.target.value })} />
      </div>
      {saveBar()}
    </div>
  );
}

export function FormFields({ profile, update, saveBar }: Props) {
  return (
    <div className="space-y-3">
      {/* Current employment. "Current company / employer / job title" is the single
          biggest hand-back cause on application forms — 12 of the 21 required
          questions we'd otherwise leave blank on the 320-form measure. Filled
          honestly from here; blank means the job is handed back, never invented. */}
      <div className="hd-sheet p-5 sm:p-6 space-y-4">
        <h3 className="hd-hist-sub-head">Current employment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Current / most recent employer" value={profile.current_employer}
            onChange={(e) => update({ current_employer: e.target.value })} placeholder="Acme Corp" />
          <Input label="Current / most recent job title" value={profile.current_title}
            onChange={(e) => update({ current_title: e.target.value })} placeholder="Software Engineer" />
        </div>
        {saveBar()}
      </div>

      {/* Mailing address. ZipRecruiter's contact step labels these Optional and then
          refuses to advance while they are blank, so a missing address quietly costs
          applications. We never invent one — the filler leaves the field empty and
          hands the job back instead. */}
      <div className="hd-sheet p-5 sm:p-6 space-y-4">
        <h3 className="hd-hist-sub-head">Mailing address</h3>
        <Input label="Street address" value={profile.street_address} onChange={(e) => update({ street_address: e.target.value })} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="City" value={profile.city} onChange={(e) => update({ city: e.target.value })} />
          <Input label="State / region" value={profile.state} onChange={(e) => update({ state: e.target.value })} placeholder="FL" />
          <Input label="ZIP / postal code" value={profile.postal_code} onChange={(e) => update({ postal_code: e.target.value })} />
        </div>
        {saveBar()}
      </div>

      {/* Work eligibility — the most frequent required questions on application
          forms. Filled honestly from here; never guessed on a knockout question. */}
      <div id="eligibility" className="hd-sheet p-5 sm:p-6 space-y-4 scroll-mt-24">
        <h3 className="hd-hist-sub-head">Work eligibility</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Authorized to work in the US?"
            value={profile.work_authorized_us === null ? "" : profile.work_authorized_us ? "yes" : "no"}
            onChange={(e) => update({ work_authorized_us: e.target.value === "" ? null : e.target.value === "yes" })}
            placeholder="Select…"
            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
          />
          <Select
            label="Do you require visa sponsorship?"
            value={profile.needs_sponsorship === null ? "" : profile.needs_sponsorship ? "yes" : "no"}
            onChange={(e) => update({ needs_sponsorship: e.target.value === "" ? null : e.target.value === "yes" })}
            placeholder="Select…"
            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
          />
          <Input label="Notice period" value={profile.notice_period}
            onChange={(e) => update({ notice_period: e.target.value })} placeholder="2 weeks" />
          <Select
            label="English level"
            value={profile.english_level}
            onChange={(e) => update({ english_level: e.target.value })}
            placeholder="Select…"
            options={[
              { value: "Native", label: "Native" },
              { value: "Fluent", label: "Fluent" },
              { value: "Professional", label: "Professional working" },
              { value: "Conversational", label: "Conversational" },
            ]}
          />
        </div>
        {saveBar()}
      </div>
    </div>
  );
}
