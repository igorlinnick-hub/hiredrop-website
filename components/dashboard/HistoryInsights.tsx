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
 *   TODAY     → the daily cap as a meter, with the pool numbers beside it
 *   WHERE     → "Where they went": platforms as bars, one hue (the categories are
 *               nominal — colouring them by size would double-encode length)
 *
 * 09-23, Igor: the first cut led with replies and a reply rate. That is not data
 * we have — a status only changes when the USER marks it by hand, so on a real
 * account every application reads "no reply yet" and the meter reads 0%. What we
 * genuinely know is the run: the daily cap, how much of it is left, how many jobs
 * are in the pool, how many arrived today. Those replaced it. Outcome counts now
 * appear only if the user has actually marked at least one — a block that can
 * only ever say zero is worse than no block.
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
import { apiGet, type StatsResponse } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

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

export default function HistoryInsights({
  rows,
  statsOverride,
}: {
  rows: Application[];
  /** Injected by /preview/history-chips — the live numbers need a session. */
  statsOverride?: StatsResponse;
}) {
  // The run's own numbers (daily cap, pool, new today). `undefined` = still
  // loading, `null` = we asked and could not get them; the card says which
  // rather than drawing a confident zero.
  const [stats, setStats] = useState<StatsResponse | null | undefined>(statsOverride);

  useEffect(() => {
    if (statsOverride) return;
    let alive = true;
    (async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session?.access_token) { if (alive) setStats(null); return; }
        const s = await apiGet<StatsResponse>("/stats", session.access_token);
        if (alive) setStats(s);
      } catch {
        if (alive) setStats(null);
      }
    })();
    return () => { alive = false; };
  }, [statsOverride]);

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
  const kToday = useCountUp(stats?.applications_today ?? 0);
  const kPool = useCountUp(stats?.total_jobs ?? 0);
  const kLeft = useCountUp(stats?.remaining_today ?? 0);
  const kNew = useCountUp(stats?.new_today ?? 0);
  const capUsed = stats && stats.daily_limit
    ? Math.min(100, Math.round((stats.applications_today / stats.daily_limit) * 100))
    : 0;
  const kCap = useCountUp(capUsed);

  // Meter geometry: a 200° arc, open at the bottom — a dial, not a donut.
  const R = 54, CX = 68, CY = 70;
  const A0 = 170, A1 = 370;                       // degrees, clockwise from 3 o'clock
  const arcLen = (2 * Math.PI * R * (A1 - A0)) / 360;
  const pt = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return `${CX + R * Math.cos(r)} ${CY + R * Math.sin(r)}`;
  };
  const trackPath = `M ${pt(A0)} A ${R} ${R} 0 1 1 ${pt(A1)}`;

  // Every tile is a number we actually hold: two from the stored applications,
  // two from the run itself. An em-dash where the backend didn't answer — never
  // a zero we can't stand behind.
  const dash = (v: number | string) => (stats === undefined ? "…" : stats === null ? "—" : v);
  const kpis = [
    { label: "Total applied", value: kTotal },
    { label: "This week", value: kWeek },
    { label: "Applied today", value: dash(kToday) },
    { label: "Jobs found", value: dash(kPool) },
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

        {/* TODAY — the daily cap as a meter, because it IS a ratio against a
            limit, with the numbers that move it beside the dial. This is the
            block a person acts on: cap reached → nothing more goes out today;
            pool empty → the sweep, not the cap, is what to fix. */}
        <div className="hd-sheet p-5 sm:p-6 lg:col-span-5" data-testid="insights-today">
          <h3 className="hd-hist-sub-head">Today</h3>

          {stats === null ? (
            <p className="hd-hist-sub mt-4">
              Couldn’t read today’s numbers — they come from the backend, and it didn’t answer.
            </p>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-5">
                <svg viewBox="0 0 136 118" className="hd-meter" role="img"
                  aria-label={`${capUsed}% of today's cap used`}>
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
                      ["--off" as string]: arcLen * (1 - capUsed / 100),
                    }}
                  />
                  <text x={CX} y={CY + 2} textAnchor="middle" className="hd-meter-num">{kCap}%</text>
                  <text x={CX} y={CY + 22} textAnchor="middle" className="hd-meter-cap">of cap</text>
                </svg>

                <ul className="min-w-0 flex-1 space-y-2.5">
                  {[
                    [`Applied today`, kToday],
                    [`Left of ${stats?.daily_limit ?? "—"}`, kLeft],
                    ["New jobs today", kNew],
                    ["Jobs found", kPool],
                  ].map(([label, value]) => (
                    <li key={label as string} className="flex items-baseline gap-2.5">
                      <span className="hd-hist-sub flex-1 whitespace-nowrap">{label}</span>
                      <b className="hd-stat-inline tabular-nums">{dash(value as number)}</b>
                    </li>
                  ))}
                </ul>
              </div>

              {/* The cap as a bar too: the dial says "how full", the bar says
                  "how much room is left" at a glance. */}
              <div className="hd-stack mt-5" role="img"
                aria-label={`${stats?.applications_today ?? 0} applied of ${stats?.daily_limit ?? 0}`}>
                <span className="hd-stack-seg" style={{ background: "var(--hd-draw)", ["--w" as string]: `${capUsed}%` }} />
                <span className="hd-stack-seg" style={{ background: "var(--hd-track)", ["--w" as string]: `${100 - capUsed}%` }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* WHAT CAME BACK — shown ONLY if the user has marked at least one reply.
          Statuses are set by hand, so on most accounts this block would be a
          confident-looking "0 replies" that means "nobody clicked the chip".
          When there IS something to show, it is part-to-whole with a named
          legend — never colour alone. */}
      {data.answered > 0 && (
        <div className="hd-sheet p-5 sm:p-6" data-testid="insights-outcomes">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="hd-hist-sub-head">What came back</h3>
            <span className="hd-eyebrow">
              <b className="hd-stat-inline hd-untrack">{data.answered}</b> of {data.total} marked
            </span>
          </div>
          <div className="hd-stack mt-4" role="img" aria-label="Outcome breakdown">
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
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {OUTCOMES.map((o) => (
              <li key={o.key} className="flex items-center gap-2.5">
                <i className="hd-dot" style={{ background: o.tone }} />
                <span className="hd-hist-sub flex-1 whitespace-nowrap">{o.label}</span>
                <b className="hd-stat-inline tabular-nums">{data.counts[o.key]}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* WHERE — nominal categories, so one hue for every bar; the length is
          the whole story and the name sits on the bar. */}
      <div className="hd-sheet p-5 sm:p-6">
          <h3 className="hd-hist-sub-head">Where they went</h3>

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
