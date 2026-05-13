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

export default function StepPlatforms({ profile, updateProfile, onNext, onBack }: Props) {
  function togglePlatform(platformId: string) {
    const current = profile.platforms;
    if (current.includes(platformId)) {
      if (current.length === 1) return; // at least one
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PLATFORMS.map((platform) => {
          const isSelected = profile.platforms.includes(platform.id);

          return (
            <button
              type="button"
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              className={[
                "relative text-left p-4 rounded-lg border-2 transition",
                isSelected
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-text2 bg-surface",
              ].join(" ")}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-text text-sm">{platform.name}</p>
                  <p className="text-xs text-text2 mt-0.5">{platform.description}</p>
                </div>
                {isSelected && (
                  <svg className="w-5 h-5 text-accent shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {platform.requiresLogin && (
                <p className="text-[10px] text-yellow mt-2">Requires platform login</p>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}
