"use client";

/**
 * HistoryInsights — the panel above the History list (Igor 09-23, sending the
 * Wispr Flow "Insights" screen: «можно ли сделать что-то в подобном стиле, но
 * несильно напутано, с логикой»).
 *
 * "С логикой" is the constraint that shaped it: four blocks, each answering one
 * question a job seeker actually has, and every number computed from the record
 * we already store (title / company / platform / status / date_applied). Nothing
 * here needs a field we don't have, so no block can go silently empty-but-pretty.
 *
 *   HOW MUCH  → the KPI row (stat tiles; a number is its own best chart)
 *   WHEN      → "Rhythm": a calendar heatmap of applications per day + streaks
 *   WHAT CAME BACK → "Replies": one meter (share answered) and, underneath, what
 *                    those answers were — the meter's own breakdown, not a
 *                    second unrelated chart
 *   WHERE     → "Where they went": platforms as bars, one hue (the categories are
 *               nominal — colouring them by size would double-encode length)
 *
 * Form choices follow the dataviz rules: a single ratio is a METER, not a
 * two-slice pie; part-to-whole is a stacked bar with a 2px surface gap and a
 * legend; the heatmap is one sequential hue with a scale legend; status colours
 * are used only where the colour MEANS a status.
 *
 * Motion (Igor: «чтоб анимация графики начиналась каждый раз при открытии
 * страницы и продолжалась 1 секунду»): everything draws itself in on mount —
 * the meter sweeps, bars grow from the baseline, heatmap cells wash in column by
 * column, the KPI digits count up — all inside 1s, and all of it is skipped under
 * prefers-reduced-motion.
 */

import { useEffect, useMemo, useState } from "react";
import type { Application } from "@/lib/types";
import { PLATFORMS } from "@/lib/constants";

const DAY = 86400000;
const WEEKS = 18;           // ≈ 4 months, in whole weeks — wider than the card can hold at a legible cell size
const ANIM_MS = 1000;       // the whole panel draws itself in one second

const platformName = (id: string) => PLATFORMS.find((p) => p.id === id)?.name ?? id;

/** The four outcomes, in the order a search actually moves. Status colours, used
 *  here because the colour genuinely means a state — never as "series 1..4". */
const OUTCOMES = [
  { key: "waiting", label: "No reply yet", tone: "var(--hd-o-wait)" },
  { key: "received", label: "Received", tone: "var(--hd-o-recv)" },
  { key: "interview", label: "Interview", tone: "var(--hd-o-intv)" },
  { key: "rejected", label: "Rejected", tone: "var(--hd-o-rej)" },
] as const;

const outcomeOf = (status: string) => {
  if (status === "interview" || status === "interview_invite" || status === "hired") return "interview";
  if (status === "received") return "received";
  if (status === "rejected") return "rejected";
  return "waiting";
};

const dayStamp = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
};

/** Digits that count up to their value on mount — the KPI row's share of the
 *  one-second entrance. Honest about the end state: it always lands on `value`,
 *  and it lands there on the first frame for a reader who asked for less motion.
 *  Every setState happens inside the rAF callback, never in the effect body. */
function useCountUp(value: number) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    let started = 0;
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const tick = (t: number) => {
      if (!started) started = t;
      if (calm) { setShown(value); return; }
      const p = Math.min(1, (t - started) / ANIM_MS);
      // same ease as the bars, so the whole panel moves as one object
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

export default function HistoryInsights({ rows }: { rows: Application[] }) {
  // One "now" per mount: every bucket below is relative to it, and a timestamp
  // that moved mid-render would put a row in two buckets.
  const [now] = useState(() => Date.now());

  const data = useMemo(() => {
    const total = rows.length;
    const week = rows.filter((a) => now - new Date(a.date_applied).getTime() < 7 * DAY).length;

    // ── Outcomes ──────────────────────────────────────────────────────────
    const counts: Record<string, number> = { waiting: 0, received: 0, interview: 0, rejected: 0 };
    for (const a of rows) counts[outcomeOf(a.status)] += 1;
    const answered = counts.received + counts.interview + counts.rejected;
    const rate = total ? Math.round((answered / total) * 100) : 0;

    // ── Platforms (nominal categories → one hue, sorted by size) ──────────
    const byPlatform = new Map<string, number>();
    for (const a of rows) byPlatform.set(a.platform, (byPlatform.get(a.platform) ?? 0) + 1);
    const platforms = Array.from(byPlatform.entries())
      .map(([id, n]) => ({ id, name: platformName(id), n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
    const platformMax = platforms.reduce((m, p) => Math.max(m, p.n), 0);

    // ── Rhythm: applications per day over the last WEEKS weeks ────────────
    const perDay = new Map<number, number>();
    for (const a of rows) {
      const k = dayStamp(new Date(a.date_applied));
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }
    // The grid ends on the current week and starts on a Sunday, so columns are
    // whole weeks and the weekday rows line up the way a calendar does.
    const today = dayStamp(new Date(now));
    const gridEnd = today + (6 - new Date(today).getDay()) * DAY;
    const gridStart = gridEnd - (WEEKS * 7 - 1) * DAY;
    const cells: { t: number; n: number; future: boolean }[] = [];
    for (let t = gridStart; t <= gridEnd; t += DAY) {
      cells.push({ t, n: perDay.get(t) ?? 0, future: t > today });
    }
    const busiest = cells.reduce((m, c) => Math.max(m, c.n), 0);

    // Streaks: consecutive days with at least one application. Current streak
    // counts back from today (yesterday still counts — a streak shouldn't break
    // because it is 9am and the run hasn't started yet).
    let current = 0;
    for (let t = (perDay.get(today) ? today : today - DAY); perDay.get(t); t -= DAY) current += 1;
    let longest = 0, running = 0;
    for (let t = gridStart; t <= today; t += DAY) {
      running = perDay.get(t) ? running + 1 : 0;
      if (running > longest) longest = running;
    }

    // Month ticks for the heatmap header — one label per month, at the column
    // where that month starts.
    const months: { col: number; label: string }[] = [];
    for (let w = 0; w < WEEKS; w += 1) {
      const d = new Date(gridStart + w * 7 * DAY);
      const label = d.toLocaleDateString(undefined, { month: "short" });
      if (!months.length || months[months.length - 1].label !== label) months.push({ col: w, label });
    }

    return { total, week, counts, answered, rate, platforms, platformMax, cells, busiest, current, longest, months };
  }, [rows, now]);

  // Heat bins: four steps of ONE hue (sequential), plus "nothing that day".
  const binOf = (n: number) => {
    if (!n) return 0;
    if (!data.busiest) return 0;
    if (n >= Math.max(4, data.busiest * 0.75)) return 4;
    if (n >= Math.max(3, data.busiest * 0.5)) return 3;
    if (n >= 2) return 2;
    return 1;
  };

  const kTotal = useCountUp(data.total);
  const kWeek = useCountUp(data.week);
  const kAnswered = useCountUp(data.answered);
  const kRate = useCountUp(data.rate);

  // Meter geometry: a 200° arc, open at the bottom — a dial, not a donut.
  const R = 54, CX = 68, CY = 70;
  const A0 = 170, A1 = 370;                       // degrees, clockwise from 3 o'clock
  const arcLen = (2 * Math.PI * R * (A1 - A0)) / 360;
  const pt = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return `${CX + R * Math.cos(r)} ${CY + R * Math.sin(r)}`;
  };
  const trackPath = `M ${pt(A0)} A ${R} ${R} 0 1 1 ${pt(A1)}`;

  const kpis = [
    { label: "Total applied", value: kTotal },
    { label: "This week", value: kWeek },
    { label: "Replies", value: kAnswered },
    { label: "Reply rate", value: `${kRate}%` },
  ];

  return (
    /* .hd-insights-run is always on: the CSS itself drops every animation under
       prefers-reduced-motion, so the entrance needs no JS gate (and no state set
       from an effect, which the React compiler rules forbid). */
    <section className="hd-insights hd-insights-run space-y-3">
      {/* HOW MUCH — the numbers are their own chart. One tile inverts. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((m, i) => (
          <div
            key={m.label}
            className={["p-4 sm:p-5", i === 0 ? "hd-tile-ink rounded-2xl" : "hd-sheet"].join(" ")}
          >
            <div className="hd-hist-num">{m.value}</div>
            <div className="hd-eyebrow mt-2.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* WHEN — rhythm. The gaps are the point: a week with no column is a week
          nothing went out, and that is the one thing a job seeker can fix. */}
      <div className="grid gap-3 lg:grid-cols-12">
      <div className="hd-sheet p-5 sm:p-6 lg:col-span-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="hd-hist-sub-head">Rhythm</h3>
            <p className="hd-eyebrow mt-1.5">Applications per day · last {WEEKS} weeks</p>
          </div>
          <div className="flex items-baseline gap-5">
            <span className="hd-eyebrow">
              Current streak <b className="hd-stat-inline hd-untrack">{data.current} days</b>
            </span>
            <span className="hd-eyebrow">
              Longest <b className="hd-stat-inline hd-untrack">{data.longest} days</b>
            </span>
          </div>
        </div>

        <div className="hd-heat-wrap hd-scroll mt-4">
          <div className="hd-heat" style={{ ["--cols" as string]: WEEKS }}>
            <div className="hd-heat-rail">
              {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                <span key={i} className="hd-eyebrow">{d}</span>
              ))}
            </div>
            <div className="hd-heat-months">
              {data.months.map((m) => (
                <span key={`${m.label}-${m.col}`} className="hd-eyebrow" style={{ gridColumn: m.col + 1 }}>
                  {m.label}
                </span>
              ))}
            </div>
            <div className="hd-heat-grid">
              {data.cells.map((c, i) => {
                const bin = binOf(c.n);
                const d = new Date(c.t);
                return (
                  <i
                    key={c.t}
                    className={["hd-cell", c.future ? "is-future" : ""].join(" ")}
                    data-bin={bin}
                    // column-by-column wash-in, the whole sweep inside ANIM_MS
                    style={{ ["--i" as string]: Math.floor(i / 7) }}
                    title={`${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${
                      c.n === 0 ? "nothing sent" : `${c.n} application${c.n === 1 ? "" : "s"}`
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="hd-eyebrow">Less</span>
          {[0, 1, 2, 3, 4].map((b) => <i key={b} className="hd-cell hd-cell-key" data-bin={b} />)}
          <span className="hd-eyebrow">More</span>
        </div>
      </div>

        {/* WHAT CAME BACK — one ratio (meter), then what it is made of. */}
        <div className="hd-sheet p-5 sm:p-6 lg:col-span-5">
          <h3 className="hd-hist-sub-head">Replies</h3>
          <p className="hd-eyebrow mt-1.5">Share of applications that got an answer</p>

          <div className="mt-4 flex items-center gap-5">
            <svg viewBox="0 0 136 118" className="hd-meter" role="img"
              aria-label={`${data.rate}% of applications got a reply`}>
              <path d={trackPath} className="hd-meter-track" fill="none" strokeLinecap="round" strokeWidth="14" />
              <path
                d={trackPath}
                className="hd-meter-fill"
                fill="none"
                strokeLinecap="round"
                strokeWidth="14"
                style={{
                  strokeDasharray: arcLen,
                  ["--len" as string]: arcLen,
                  ["--off" as string]: arcLen * (1 - data.rate / 100),
                }}
              />
              <text x={CX} y={CY + 2} textAnchor="middle" className="hd-meter-num">{kRate}%</text>
              <text x={CX} y={CY + 22} textAnchor="middle" className="hd-meter-cap">answered</text>
            </svg>

            {/* The legend IS the breakdown: colour, name and count on one line,
                so identity never rides on colour alone. */}
            <ul className="min-w-0 flex-1 space-y-2.5">
              {OUTCOMES.map((o) => (
                <li key={o.key} className="flex items-center gap-2.5">
                  <i className="hd-dot" style={{ background: o.tone }} />
                  <span className="hd-hist-sub flex-1 whitespace-nowrap">{o.label}</span>
                  <b className="hd-stat-inline tabular-nums">{data.counts[o.key]}</b>
                </li>
              ))}
            </ul>
          </div>

          {/* Part-to-whole, full width so the three small outcomes stay visible:
              4 segments, 2px surface gaps, each named in the legend above. */}
          <div className="hd-stack mt-5" role="img" aria-label="Outcome breakdown">
            {OUTCOMES.map((o) => {
              const n = data.counts[o.key];
              if (!n) return null;
              return (
                <span
                  key={o.key}
                  className="hd-stack-seg"
                  style={{ background: o.tone, ["--w" as string]: `${(n / (data.total || 1)) * 100}%` }}
                  title={`${o.label}: ${n}`}
                />
              );
            })}
          </div>
        </div>

      </div>

      {/* WHERE — nominal categories, so one hue for every bar; the length is
          the whole story and the name sits on the bar. */}
      <div className="hd-sheet p-5 sm:p-6">
          <h3 className="hd-hist-sub-head">Where they went</h3>
          <p className="hd-eyebrow mt-1.5">Applications by platform</p>

          {data.platforms.length === 0 ? (
            <p className="hd-hist-sub mt-4">Nothing sent yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.platforms.map((p, i) => (
                <li key={p.id} className="hd-bar-row">
                  <span className="hd-eyebrow hd-bar-name">{p.name}</span>
                  <span className="hd-bar-track">
                    <span
                      className="hd-bar-fill"
                      style={{
                        ["--w" as string]: `${data.platformMax ? (p.n / data.platformMax) * 100 : 0}%`,
                        ["--i" as string]: i,
                      }}
                    />
                  </span>
                  <b className="hd-stat-inline tabular-nums">{p.n}</b>
                </li>
              ))}
            </ul>
        )}
      </div>
    </section>
  );
}
