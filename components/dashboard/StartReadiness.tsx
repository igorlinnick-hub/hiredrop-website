"use client";

import { apiGet } from "@/lib/api";

// One server-side start precondition (GET /campaign/readiness). `fix` is a machine id
// the UI maps to a deep-link/action: keywords | settings | tap | upgrade | onboarding | campaign.
export interface ReadinessCheck {
  id: string;
  ok: boolean;
  reason: string | null;
  fix: string | null;
}

export interface Readiness {
  ready: boolean;
  checks: ReadinessCheck[];
}

// Server-known preconditions, straight from the single source of truth.
export async function fetchReadiness(token: string): Promise<Readiness> {
  return apiGet<Readiness>("/campaign/readiness", token);
}

// The one precondition the server CANNOT know: is the extension installed on THIS
// browser? ping.js answers HIREDROP_PING with HIREDROP_PONG when injected.
export function checkExtensionPresent(timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      resolve(v);
    };
    function onMsg(e: MessageEvent) {
      if (e.source === window && e.data === "HIREDROP_PONG") finish(true);
    }
    window.addEventListener("message", onMsg);
    window.postMessage("HIREDROP_PING", "*");
    setTimeout(() => finish(false), timeoutMs);
  });
}

// Full gate: server checks + the local extension check, merged into one list.
// Fail-open on a server hiccup (empty ready result) — the extension's own start
// guards are the backstop; a flaky network must not brick the Start button.
export async function gateStart(token: string): Promise<Readiness> {
  let server: Readiness = { ready: true, checks: [] };
  try {
    server = await fetchReadiness(token);
  } catch {
    /* fail-open */
  }
  const extPresent = await checkExtensionPresent();
  const checks: ReadinessCheck[] = [
    ...server.checks,
    {
      id: "extension",
      ok: extPresent,
      reason: extPresent ? null : "Install the HireDrop extension — it does the actual applying",
      fix: extPresent ? null : "extension",
    },
  ];
  return { ready: server.ready && extPresent, checks };
}

const FIX_LABELS: Record<string, string> = {
  keywords: "Add keywords",
  settings: "Open Settings",
  tap: "Switch to Tap",
  upgrade: "See plans",
  onboarding: "Finish setup",
  campaign: "View campaign",
  extension: "Get the extension",
};

// "Almost there" checklist — shown INSTEAD of starting when something is missing.
// The Start button stays clickable (a disabled button explains nothing); this explains
// exactly what's left, each row with a one-click fix.
export default function StartReadinessModal({
  open,
  onClose,
  checks,
  onFix,
}: {
  open: boolean;
  onClose: () => void;
  checks: ReadinessCheck[];
  onFix: (fix: string) => void;
}) {
  if (!open) return null;
  const failed = checks.filter((c) => !c.ok);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "hdReadyIn .18s ease" }}
      >
        <style>{`@keyframes hdReadyIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}`}</style>

        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-lg font-bold text-text">Almost there</h3>
          <button onClick={onClose} className="text-text2/50 hover:text-text transition -mr-1 -mt-1 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-text2/70 mb-4">
          A couple of things before your campaign can actually apply:
        </p>

        <div className="space-y-2.5">
          {failed.map((c) => (
            <div key={c.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface2/40 p-3.5">
              <span className="shrink-0 w-6 h-6 rounded-full bg-yellow/15 text-yellow flex items-center justify-center">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" viewBox="0 0 24 24">
                  <path d="M12 8v5m0 3.5v.5" />
                </svg>
              </span>
              <span className="flex-1 text-[13px] text-text leading-snug">{c.reason}</span>
              {c.fix && (
                <button
                  onClick={() => onFix(c.fix!)}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white
                    hover:bg-accent2 transition"
                >
                  {FIX_LABELS[c.fix] || "Fix"}
                </button>
              )}
            </div>
          ))}
          {failed.length === 0 && (
            <p className="text-sm text-text2">All set — hit Start again.</p>
          )}
        </div>
      </div>
    </div>
  );
}
