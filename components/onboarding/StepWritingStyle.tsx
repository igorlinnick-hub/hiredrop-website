"use client";

import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import type { UserProfile } from "@/lib/types";

interface Props {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepWritingStyle({ profile, updateProfile, onNext, onBack }: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onNext();
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">Writing Style</h2>
        <p className="text-sm text-text2 mt-1">
          Help our AI write cover letters that sound like <strong>you</strong>, not like a robot.
        </p>
      </div>

      <Textarea
        label="Your writing sample"
        name="writing_style"
        value={profile.writing_style}
        onChange={(e) => updateProfile({ writing_style: e.target.value })}
        placeholder="Paste a sample of your writing. This can be an email, a message, a LinkedIn post — anything you've written naturally. The AI will match your tone, vocabulary, and rhythm."
        rows={6}
        hint="Optional but highly recommended. Without this, AI will use a neutral professional tone."
      />

      {profile.writing_style.length > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
          <p className="text-xs font-medium text-accent mb-2">Preview — AI will match this tone:</p>
          <p className="text-sm text-text2 italic">
            &ldquo;{profile.writing_style.slice(0, 200)}
            {profile.writing_style.length > 200 ? "..." : ""}&rdquo;
          </p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}
