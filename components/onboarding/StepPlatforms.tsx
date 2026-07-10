"use client";

import Button from "@/components/ui/Button";
import { PLATFORMS } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

interface Props {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}

const autoApplyPlatforms = PLATFORMS.filter((p) => p.autoApply);

export default function StepPlatforms({ profile, updateProfile, onNext, onBack }: Props) {
  function togglePlatform(platformId: string) {
    const current = profile.platforms.filter((p) => autoApplyPlatforms.some((ap) => ap.id === p));
    if (current.includes(platformId)) {
      if (current.length === 1) return; // keep at least one selected
      updateProfile({ platforms: current.filter((p) => p !== platformId) });
    } else {
      updateProfile({ platforms: [...current, platformId] });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">Where should HireDrop apply?</h2>
        <p className="text-sm text-text2 mt-1">
          HireDrop auto-fills and submits applications for you on these platforms. Pick at least one.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {autoApplyPlatforms.map((platform) => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            selected={profile.platforms.includes(platform.id)}
            onToggle={() => togglePlatform(platform.id)}
          />
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}

function PlatformCard({
  platform,
  selected,
  onToggle,
  badge,
  badgeColor,
}: {
  platform: { id: string; name: string; description: string };
  selected: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: "green" | "accent";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "relative text-left p-3 rounded-lg border-2 transition",
        selected ? "border-accent bg-accent/5" : "border-border hover:border-text2 bg-surface",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-text text-sm">{platform.name}</p>
            {badge && (
              <span
                className={[
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  badgeColor === "green"
                    ? "bg-green/10 text-green"
                    : "bg-accent/10 text-accent",
                ].join(" ")}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-text2 mt-0.5">{platform.description}</p>
        </div>
        {selected && (
          <svg className="w-5 h-5 text-accent shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </button>
  );
}
