"use client";

type IconName = "doc" | "search" | "sparkle" | "pen" | "check" | "inbox";

const ICONS: Record<IconName, React.ReactNode> = {
  doc: (
    <>
      <path d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1Z" />
      <path d="M14 3v4h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4-4" />
    </>
  ),
  sparkle: <path d="M12 4l1.6 4.9L18.5 10.5l-4.9 1.6L12 17l-1.6-4.9L5.5 10.5l4.9-1.6L12 4Z" />,
  pen: (
    <>
      <path d="M4 20l4-1L18 9l-3-3L5 16l-1 4Z" />
      <path d="M13.5 7.5l3 3" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  inbox: (
    <>
      <path d="M3 8l7.9 5.3a2 2 0 002.2 0L21 8" />
      <path d="M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2Z" />
    </>
  ),
};

interface Item {
  icon: IconName;
  text: string;
  sub: string;
  live?: boolean;
  green?: boolean;
}

const ITEMS: Item[] = [
  { icon: "doc", text: "Resume uploaded", sub: "Igor_CV_2026.pdf" },
  { icon: "search", text: "Scanning Indeed", sub: "1,240 jobs found" },
  { icon: "sparkle", text: "AI matching", sub: "47 relevant jobs" },
  { icon: "pen", text: "Letter generated", sub: "Marketing Manager @ Stripe" },
  { icon: "check", text: "Applied safely", sub: "from your browser", live: true, green: true },
  { icon: "inbox", text: "Interview request", sub: "Marketing Manager @ Notion", live: true, green: true },
];

function TickerCard({ item }: { item: Item }) {
  return (
    <div
      className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-[#E8E8F0] shrink-0 min-w-[230px]"
      style={{ boxShadow: "0 2px 8px rgba(108,92,231,0.08)" }}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          item.green ? "bg-green/10 text-green" : "bg-accent-light text-accent"
        }`}
      >
        <svg
          className="w-[18px] h-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          {ICONS[item.icon]}
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-[#1A1A2E]">{item.text}</p>
          {item.live && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#00B894]"
              style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
            />
          )}
        </div>
        <p className="text-xs text-[#6B6B8A]">{item.sub}</p>
      </div>
    </div>
  );
}

export default function Ticker() {
  const repeated = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];

  return (
    <div className="w-full overflow-hidden py-8 bg-[#F7F7FB]">
      <div className="flex gap-4" style={{ animation: "ticker 55s linear infinite", width: "max-content" }}>
        {repeated.map((item, i) => (
          <TickerCard key={i} item={item} />
        ))}
      </div>
    </div>
  );
}
