interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
  hint?: string;
}

function StatCard({ label, value, icon, href, hint }: StatCardProps) {
  const inner = (
    <div
      className={[
        "group relative bg-surface border border-border rounded-xl p-5 transition-all duration-200",
        href
          ? "hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
          : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text2">{label}</p>
          <p className="text-2xl font-bold text-text mt-1">{value}</p>
        </div>
        <div className={[
          "p-2 rounded-lg transition-colors duration-200",
          href
            ? "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white"
            : "bg-accent/10 text-accent",
        ].join(" ")}>{icon}</div>
      </div>
      {hint && (
        <p className="mt-2 text-[11px] text-text2/0 group-hover:text-accent/70 transition-all duration-200 font-medium">
          {hint}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    );
  }
  return inner;
}

interface StatsCardsProps {
  totalJobs: number;
  totalApplications: number;
  applicationsToday: number;
  responseRate: number;
}

export default function StatsCards({
  totalJobs,
  totalApplications,
  applicationsToday,
  responseRate,
}: StatsCardsProps) {
  const rateDisplay = responseRate > 0
    ? `${(responseRate * 100).toFixed(0)}%`
    : "0%";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Jobs Found"
        value={totalJobs}
        href="#jobs"
        hint="View job listings →"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
      />
      <StatCard
        label="Applications Sent"
        value={totalApplications}
        href="#history"
        hint="View application history →"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        }
      />
      <StatCard
        label="Applied Today"
        value={applicationsToday}
        href="#history"
        hint="View today's applications →"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
      />
      <StatCard
        label="Response Rate"
        value={rateDisplay}
        href="#history"
        hint="View replies & interviews →"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        }
      />
    </div>
  );
}
