"use client";

import { useState } from "react";
import { PLATFORMS } from "@/lib/constants";

// Launch-time platform picker (Igor 2026-07-16): the platform list left the main screen
// (it was outgrowing the filter row) — instead, pressing Start asks ONE question:
// "Where should we apply today?" A radio, because a single campaign runs exactly one
// platform (the runtime walks one board/queue per run; tap-pool mixes on its own page).
export default function LaunchModal({
  open,
  current,
  connections,
  onClose,
  onLaunch,
}: {
  open: boolean;
  current: string;
  connections: Record<string, { status: string }>;
  onClose: () => void;
  onLaunch: (platformId: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  if (!open) return null;
  const options = PLATFORMS.filter((p) => p.autoApply);
  const selected = picked || current || options[0]?.id;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "hdLaunchIn .18s ease" }}
      >
        <style>{`@keyframes hdLaunchIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}`}</style>

        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-lg font-bold text-text">Where should we apply today?</h3>
          <button onClick={onClose} className="text-text2/50 hover:text-text transition -mr-1 -mt-1 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-text2/70 mb-4">One platform per run — pick today&apos;s target.</p>

        <div className="space-y-2.5">
          {options.map((p) => {
            const on = selected === p.id;
            const conn = connections[p.id]?.status;
            return (
              <button
                key={p.id}
                onClick={() => setPicked(p.id)}
                className={[
                  "w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition",
                  on
                    ? "border-accent bg-accent/[0.06] ring-2 ring-accent/15"
                    : "border-border bg-surface2/40 hover:border-accent/50",
                ].join(" ")}
              >
                <span className={[
                  "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                  on ? "border-accent" : "border-border",
                ].join(" ")}>
                  {on && <span className="w-2 h-2 rounded-full bg-accent" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-text">{p.name}</span>
                    {p.beta && (
                      <span className="px-1.5 py-px text-[9px] font-bold uppercase tracking-wide rounded-full
                        bg-accent/12 text-accent leading-none">beta</span>
                    )}
                    {conn === "connected" && (
                      <span className="text-[10px] text-green font-semibold">✓ connected</span>
                    )}
                    {conn === "logged_out" && (
                      <span className="text-[10px] text-yellow font-semibold">sign-in needed</span>
                    )}
                  </span>
                  <span className="block text-xs text-text2 mt-0.5 leading-snug">{p.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => selected && onLaunch(selected)}
          className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold
            bg-accent text-white hover:bg-accent2 transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd" />
          </svg>
          Start on {PLATFORMS.find((p) => p.id === selected)?.name || "…"}
        </button>
      </div>
    </div>
  );
}
