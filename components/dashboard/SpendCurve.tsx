"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/pricing";

type Point = { day: number; spend: number; apps: number; projected?: boolean };

interface SpendCurveProps {
  /** Optional override; if absent we render a plausible stub series. */
  points?: Point[];
  /** Day-of-month "today" — defaults to current local date. Points after this are projected. */
  today?: number;
  /** Header total — falls back to last actual point's spend. */
  totalCredits?: number;
}

/**
 * Stub data generator: 30-day series with a smooth-rising curve.
 *
 * Real data will come from the usage_ledger aggregation; see BILLING_LEDGER_TASKS.md.
 */
function buildStub(today: number): Point[] {
  const points: Point[] = [];
  // Cumulative spend grows roughly as f(day) = a * day + b * day^1.4 — visually
  // a gently accelerating curve, which sells "more activity → more spend".
  for (let day = 1; day <= 30; day++) {
    const base = 60 * day + 8 * Math.pow(day, 1.4);
    // Light jitter so the curve doesn't feel synthetic, but stays monotonic.
    const jitter = Math.sin(day * 1.7) * 25;
    const spend = Math.max(0, Math.round(base + jitter));
    const apps = Math.round(spend / 28); // ~28¢/app — matches calculator default
    points.push({ day, spend, apps, projected: day > today });
  }
  return points;
}

export default function SpendCurve({
  points,
  today: todayProp,
  totalCredits,
}: SpendCurveProps) {
  const today = todayProp ?? new Date().getDate();
  const data = useMemo(() => points ?? buildStub(today), [points, today]);
  const [hover, setHover] = useState<number | null>(null);

  const maxSpend = Math.max(...data.map((p) => p.spend), 1);
  const actualToday = data.find((p) => p.day === today) ?? data[data.length - 1];
  const headerTotal = totalCredits ?? actualToday.spend;

  // SVG geometry
  const W = 720;
  const H = 220;
  const PAD_L = 12;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const x = (day: number) => PAD_L + ((day - 1) / (data.length - 1)) * innerW;
  const y = (spend: number) => PAD_T + innerH - (spend / maxSpend) * innerH;

  // Two paths: solid (actual, day <= today) and dashed (projection).
  const actualPoints = data.filter((p) => p.day <= today);
  const projectedPoints = data.filter((p) => p.day >= today);

  const linePath = (pts: Point[]) =>
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.day).toFixed(2)} ${y(p.spend).toFixed(2)}`)
      .join(" ");

  const areaPath = (pts: Point[]) => {
    if (pts.length === 0) return "";
    const top = linePath(pts);
    const lastX = x(pts[pts.length - 1].day);
    const firstX = x(pts[0].day);
    const baseY = PAD_T + innerH;
    return `${top} L ${lastX.toFixed(2)} ${baseY} L ${firstX.toFixed(2)} ${baseY} Z`;
  };

  const hovered = hover != null ? data[hover] : null;

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-text">Spend this month</h3>
          <p className="text-sm text-text2 mt-0.5">
            Pay-as-you-apply &middot; you spend more when you hunt harder.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="Spent so far" value={formatUsd(headerTotal)} accent />
          <Stat
            label="Projected EOM"
            value={formatUsd(data[data.length - 1].spend)}
            sub="based on this month's pace"
          />
          <Stat
            label="Applications"
            value={String(actualToday.apps)}
            sub={`day ${today}/30`}
          />
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[220px] overflow-visible"
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="Spend curve over the current month"
        >
          <defs>
            <linearGradient id="spendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="projArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent2)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--accent2)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y gridlines (4 evenly spaced) */}
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const gy = PAD_T + innerH - frac * innerH;
            return (
              <line
                key={frac}
                x1={PAD_L}
                x2={W - PAD_R}
                y1={gy}
                y2={gy}
                stroke="var(--border)"
                strokeDasharray="2 4"
                strokeWidth={1}
              />
            );
          })}

          {/* Projection area (dashed look via opacity gradient) */}
          {projectedPoints.length > 1 && (
            <path d={areaPath(projectedPoints)} fill="url(#projArea)" />
          )}

          {/* Actual area */}
          <path d={areaPath(actualPoints)} fill="url(#spendArea)" />

          {/* Projection line (dashed) */}
          {projectedPoints.length > 1 && (
            <path
              d={linePath(projectedPoints)}
              fill="none"
              stroke="var(--accent2)"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          )}

          {/* Actual line — solid, accent */}
          <path
            d={linePath(actualPoints)}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Today marker */}
          <line
            x1={x(today)}
            x2={x(today)}
            y1={PAD_T}
            y2={PAD_T + innerH}
            stroke="var(--accent)"
            strokeWidth={1}
            strokeDasharray="2 3"
            opacity={0.5}
          />
          <circle cx={x(today)} cy={y(actualToday.spend)} r={5} fill="var(--accent)" />
          <circle
            cx={x(today)}
            cy={y(actualToday.spend)}
            r={9}
            fill="var(--accent)"
            opacity={0.18}
          />

          {/* Hover layer — one rect per point, invisible, drives the tooltip */}
          {data.map((p, i) => (
            <rect
              key={p.day}
              x={x(p.day) - innerW / data.length / 2}
              y={PAD_T}
              width={innerW / data.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}

          {/* Hover dot + vertical guide */}
          {hovered && (
            <>
              <line
                x1={x(hovered.day)}
                x2={x(hovered.day)}
                y1={PAD_T}
                y2={PAD_T + innerH}
                stroke="var(--text2)"
                strokeWidth={1}
                opacity={0.4}
              />
              <circle
                cx={x(hovered.day)}
                cy={y(hovered.spend)}
                r={4.5}
                fill={hovered.projected ? "var(--accent2)" : "var(--accent)"}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            </>
          )}

          {/* X-axis day labels (every 5 days) */}
          {data
            .filter((p) => p.day === 1 || p.day % 5 === 0 || p.day === 30)
            .map((p) => (
              <text
                key={p.day}
                x={x(p.day)}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                fill="var(--text2)"
              >
                {p.day === 1 ? "Day 1" : p.day === 30 ? "30" : p.day}
              </text>
            ))}
        </svg>

        {hovered && (
          <div
            className="absolute pointer-events-none bg-surface border border-border rounded-lg px-3 py-2 shadow-lg text-xs"
            style={{
              left: `${(x(hovered.day) / W) * 100}%`,
              top: 4,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-semibold text-text">
              Day {hovered.day}
              {hovered.projected && (
                <span className="ml-2 text-[10px] text-text2 font-normal">projected</span>
              )}
            </div>
            <div className="text-text2 tabular-nums">
              {formatUsd(hovered.spend)} &middot; {hovered.apps} apps
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-text2">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-accent rounded-full" /> Actual spend
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-accent2 rounded-full opacity-60 [border-style:dashed]" />
          Projection
        </span>
        <span className="ml-auto text-[11px] text-text2">
          Stub data — wires up after billing ledger ships.
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="text-right">
      <div className="text-[11px] uppercase tracking-wide text-text2 font-medium">{label}</div>
      <div
        className={[
          "text-xl font-bold tabular-nums leading-tight",
          accent ? "text-accent" : "text-text",
        ].join(" ")}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-text2">{sub}</div>}
    </div>
  );
}
