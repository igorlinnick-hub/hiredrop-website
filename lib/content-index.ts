// Registry of the organic-search content: comparisons and guides.
//
// One list, three consumers — the hub pages, the "Keep reading" blocks, and the
// footer's Resources column. A page added here shows up in all three, so internal
// linking can't silently rot (an orphan page is a page Google never recrawls).
//
// `path` must also exist in PUBLIC_PAGES in lib/seo.ts — that's what the sitemap reads.

export type ContentEntry = {
  path: string;
  /** Card heading on hubs — shorter than the page's <title>. */
  title: string;
  /** Card body. Says what the reader gets, not what the page "covers". */
  description: string;
  /** ISO date used for Article markup and the visible "Updated" line. */
  published: string;
};

export const ALTERNATIVES: ContentEntry[] = [
  {
    path: "/alternatives/lazyapply",
    title: "HireDrop vs LazyApply",
    description:
      "Volume blasting at 150 applications a day versus 30 human-paced ones you approve. What each approach actually costs you.",
    published: "2026-09-09",
  },
  {
    path: "/alternatives/aiapply",
    title: "HireDrop vs AIApply",
    description:
      "A toolbox of AI career tools with auto-apply sold in credit packs, versus one pipeline that applies for you. Which fits your search.",
    published: "2026-09-09",
  },
];

export const GUIDES: ContentEntry[] = [
  {
    path: "/guides/auto-apply-indeed",
    title: "How to auto-apply to jobs on Indeed",
    description:
      "What Indeed's two application types mean for automation, why most bots break on them, and how to automate without putting the account at risk.",
    published: "2026-09-09",
  },
  {
    path: "/guides/ats-resume-keywords",
    title: "How ATS resume screening actually works",
    description:
      "What Greenhouse, Lever and Ashby really do with your file, which myths waste your time, and the fields that quietly disqualify you.",
    published: "2026-09-09",
  },
];

export const ALL_CONTENT = [...ALTERNATIVES, ...GUIDES];

/** Cards for a "Keep reading" block: everything except the page you're on. */
export function relatedTo(path: string, limit = 4) {
  return ALL_CONTENT.filter((entry) => entry.path !== path)
    .slice(0, limit)
    .map((entry) => ({
      title: entry.title,
      description: entry.description,
      href: entry.path,
    }));
}

/** "September 9, 2026" — the visible form of an entry's `published` date. */
export function formatPublished(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}
