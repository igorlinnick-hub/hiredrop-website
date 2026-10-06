"use client";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { UserProfile } from "@/lib/types";

interface Props {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
}

export default function StepPersonalInfo({ profile, updateProfile, onNext }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onNext();
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">Personal Information</h2>
        <p className="text-sm text-text2 mt-1">This info will be used when applying to jobs.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="First name"
          name="name"
          value={profile.name}
          onChange={(e) => updateProfile({ name: e.target.value })}
          placeholder="John"
          required
        />
        <Input
          label="Last name"
          name="last_name"
          value={profile.last_name}
          onChange={(e) => updateProfile({ last_name: e.target.value })}
          placeholder="Doe"
          required
        />
      </div>

      <Input
        label="Email"
        name="email"
        type="email"
        value={profile.email}
        onChange={(e) => updateProfile({ email: e.target.value })}
        placeholder="you@example.com"
        hint="This email will be inserted into job application forms."
        required
      />

      <Input
        label="Phone"
        name="phone"
        type="tel"
        value={profile.phone}
        onChange={(e) => updateProfile({ phone: e.target.value })}
        placeholder="+1 (555) 000-0000"
        hint="Required for Indeed applications."
        required
      />

      <div className="flex justify-end pt-2">
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}
