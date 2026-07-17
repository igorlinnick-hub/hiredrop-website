/** Small monoline icon shown above each onboarding step (keyed by step id). */

const ICONS: Record<number, React.ReactNode> = {
  // 1 Profile — person
  1: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0114 0" />
    </>
  ),
  // 2 Preferences — filter
  2: <path d="M4 5h16l-6 8v5l-4 2v-7L4 5Z" />,
  // 3 Safety — shield + check
  3: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  // 4 Platforms — grid
  4: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  // 5 Resume — document
  5: (
    <>
      <path d="M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  // 6 ATS — scan / magnifier on doc
  6: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <circle cx="11" cy="12" r="2.5" />
      <path d="M15 16l2.5 2.5" />
    </>
  ),
  // 7 Style — pen
  7: (
    <>
      <path d="M4 20l4-1L18 9l-3-3L5 16l-1 4Z" />
      <path d="M13.5 7.5l3 3" />
    </>
  ),
  // 8 Plan — card
  8: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </>
  ),
  // 9 Done — check circle
  9: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
};

export function StepIcon({ step }: { step: number }) {
  const icon = ICONS[step];
  if (!icon) return null;
  return (
    <div className="w-12 h-12 mx-auto mb-5 rounded-2xl bg-accent-light flex items-center justify-center">
      <svg
        className="w-6 h-6 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        {icon}
      </svg>
    </div>
  );
}
