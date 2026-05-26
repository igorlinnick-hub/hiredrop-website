"use client";

import { useMemo, useState } from "react";
import {
  JOB_SOURCES,
  TIER_LABEL,
  TIER_BADGE_CLASS,
  estimateCost,
  formatUsd,
} from "@/lib/pricing";

const VOLUME_PRESETS = [25, 100, 250, 500, 1000];

const DEFAULT_MIX = {
  greenhouse: 0.35,
  lever: 0.15,
  ashby: 0.1,
  workable: 0.05,
  wwr: 0.05,
  google_jobs: 0.25,
  theirstack: 0.05,
};

export default function CreditCalculator() {
  const [applications, setApplications] = useState(100);
  const [mix, setMix] = useState<Record<string, number>>(DEFAULT_MIX);

  const cost = useMemo(() => estimateCost(applications, mix), [applications, mix]);

  function setSourceShare(id: string, value: number) {
    setMix((prev) => ({ ...prev, [id]: value }));
  }

  const totalShare = Object.values(mix).reduce((s, v) => s + v, 0);

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-bold text-text">Cost calculator</h3>
          <p className="text-sm text-text2 mt-0.5">
            Transparent math — see what your job hunt actually costs.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-text tabular-nums">
            {formatUsd(cost.totalPrice)}
          </div>
          <div className="text-xs text-text2">
            for {applications} applications &middot; {(cost.pricePerApp / 100).toFixed(2)}¢ each
          </div>
        </div>
      </div>

      {/* Volume picker */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-text2 mb-2">
          Application volume this month
        </label>
        <div className="flex flex-wrap gap-2">
          {VOLUME_PRESETS.map((v) => {
            const active = v === applications;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setApplications(v)}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm border transition tabular-nums",
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-border text-text2 hover:border-text2",
                ].join(" ")}
              >
                {v}
              </button>
            );
          })}
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="range"
              min={10}
              max={1500}
              step={10}
              value={applications}
              onChange={(e) => setApplications(Number(e.target.value))}
              className="w-40 accent-accent"
            />
            <span className="text-sm tabular-nums text-text w-12 text-right">{applications}</span>
          </div>
        </div>
      </div>

      {/* Cost breakdown bar */}
      <div className="mb-5">
        <div className="flex items-end justify-between text-xs text-text2 mb-1.5">
          <span>Cost breakdown per application</span>
          <span className="tabular-nums">
            {(cost.pricePerApp / 100).toFixed(2)}¢ &times; {applications} = {formatUsd(cost.totalPrice)}
          </span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-surface2">
          <Segment value={cost.components.source} total={cost.pricePerApp} className="bg-accent" />
          <Segment value={cost.components.scoring} total={cost.pricePerApp} className="bg-accent2" />
          <Segment
            value={cost.components.coverLetter}
            total={cost.pricePerApp}
            className="bg-green"
          />
          <Segment value={cost.components.submit} total={cost.pricePerApp} className="bg-yellow" />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text2">
          <LegendDot className="bg-accent" label="Source" value={cost.components.source} />
          <LegendDot className="bg-accent2" label="AI scoring" value={cost.components.scoring} />
          <LegendDot className="bg-green" label="Cover letter" value={cost.components.coverLetter} />
          <LegendDot className="bg-yellow" label="Submit" value={cost.components.submit} />
        </div>
      </div>

      {/* Source mix */}
      <div>
        <div className="flex items-center justify-between text-xs font-medium text-text2 mb-2">
          <span>Where the jobs come from</span>
          <span className="tabular-nums">
            {totalShare === 0 ? "0%" : "100% mix"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {JOB_SOURCES.map((src) => {
            const share = mix[src.id] ?? 0;
            return (
              <div
                key={src.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-text truncate">{src.name}</span>
                    <span
                      className={[
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                        TIER_BADGE_CLASS[src.tier],
                      ].join(" ")}
                    >
                      {TIER_LABEL[src.tier]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={share}
                    onChange={(e) => setSourceShare(src.id, Number(e.target.value))}
                    className="w-full accent-accent h-1"
                  />
                </div>
                <div className="text-xs tabular-nums text-text2 w-10 text-right">
                  {Math.round(share * 100)}%
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-text2 leading-relaxed">
          Free sources (Greenhouse, Lever, Ashby) keep cost low. Premium sources widen coverage
          when free APIs don&apos;t have what you need. Numbers update live as you adjust the mix.
        </p>
      </div>
    </div>
  );
}

function Segment({
  value,
  total,
  className,
}: {
  value: number;
  total: number;
  className: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  if (pct <= 0) return null;
  return <div className={className} style={{ width: `${pct}%` }} />;
}

function LegendDot({
  className,
  label,
  value,
}: {
  className: string;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={["inline-block w-2 h-2 rounded-full", className].join(" ")} />
      <span>
        {label} <span className="tabular-nums">{(value / 100).toFixed(2)}¢</span>
      </span>
    </span>
  );
}
