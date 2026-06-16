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
const discoveryPlatforms = PLATFORMS.filter((p) => !p.autoApply);

export default function StepPlatforms({ profile, updateProfile, onNext, onBack }: Props) {
  function togglePlatform(platformId: string) {
    const current = profile.platforms;
    if (current.includes(platformId)) {
      if (current.length === 1) return;
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
        <h2 className="text-xl font-bold text-text">Search Platforms</h2>
        <p className="text-sm text-text2 mt-1">Choose where to search for jobs. Select at least one.</p>
      </div>

      {/* Auto-apply platforms */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-green uppercase tracking-wide">Auto-apply</span>
          <span className="text-xs text-text2">— Extension fills & submits the form for you</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {autoApplyPlatforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              selected={profile.platforms.includes(platform.id)}
              onToggle={() => togglePlatform(platform.id)}
              badge="Auto-apply"
              badgeColor="green"
            />
          ))}
        </div>
      </div>

      {/* Discovery platforms */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-accent uppercase tracking-wide">Discovery</span>
          <span className="text-xs text-text2">— We find jobs, you apply via the job listing</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {discoveryPlatforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              selected={profile.platforms.includes(platform.id)}
              onToggle={() => togglePlatform(platform.id)}
            />
          ))}
        </div>
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
