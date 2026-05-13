interface UsageBannerProps {
  tier: string;
  tierLabel: string;
  usedToday: number;
  dailyLimit: number;
  remainingToday: number;
  platformCounts: Record<string, number>;
  maxPerPlatform: number;
}

const tierColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  pro: "bg-blue-100 text-blue-700",
  elite: "bg-purple-100 text-purple-700",
  admin: "bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-900",
};

export default function UsageBanner({
  tier,
  tierLabel,
  usedToday,
  dailyLimit,
  remainingToday,
  platformCounts,
  maxPerPlatform,
}: UsageBannerProps) {
  const isAdmin = tier === "admin";
  const pct = dailyLimit > 0 ? Math.min(100, (usedToday / dailyLimit) * 100) : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-accent";

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={[
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                tierColors[tier] || tierColors.free,
              ].join(" ")}
            >
              {isAdmin ? "Admin ✦" : `${tierLabel} Plan`}
            </span>
            <span className="text-sm text-text2">
              {isAdmin ? `${usedToday} applications today` : `${usedToday} / ${dailyLimit} applications today`}
            </span>
            {!isAdmin && (
              <span className="text-sm text-green font-medium ml-auto sm:ml-0">
                {remainingToday} remaining
              </span>
            )}
            {isAdmin && (
              <span className="text-sm text-amber-600 font-medium ml-auto sm:ml-0">
                Unlimited ∞
              </span>
            )}
          </div>

          {/* Progress bar — admins get a solid gold bar, not usage-driven */}
          <div className="w-full bg-surface2 rounded-full h-2">
            <div
              className={[
                "h-2 rounded-full transition-all duration-500",
                isAdmin ? "bg-gradient-to-r from-amber-300 to-yellow-400" : barColor,
              ].join(" ")}
              style={{ width: isAdmin ? "100%" : `${pct}%` }}
            />
          </div>
        </div>

        {!isAdmin && tier !== "elite" && (
          <a
            href="/dashboard/settings?tab=billing"
            className="shrink-0 text-xs font-medium text-accent hover:text-accent2 border border-accent/30 hover:border-accent/60 px-3 py-1.5 rounded-lg transition"
          >
            Upgrade →
          </a>
        )}
      </div>

      {/* Per-platform usage (hidden for admins — no limit to track) */}
      {!isAdmin && Object.keys(platformCounts).length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-text2 mb-2 font-medium">Today by platform</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(platformCounts).map(([platform, count]) => {
              const platPct = Math.min(100, (count / maxPerPlatform) * 100);
              return (
                <div key={platform} className="flex items-center gap-1.5 text-xs text-text2">
                  <span className="capitalize font-medium text-text">{platform}</span>
                  <span>{count}/{maxPerPlatform}</span>
                  <div className="w-16 bg-surface2 rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-accent/60"
                      style={{ width: `${platPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin: show platform counts without limits */}
      {isAdmin && Object.keys(platformCounts).length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-text2 mb-2 font-medium">Today by platform</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(platformCounts).map(([platform, count]) => (
              <div key={platform} className="flex items-center gap-1.5 text-xs text-text2">
                <span className="capitalize font-medium text-text">{platform}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
