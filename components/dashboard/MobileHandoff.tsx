"use client";

import { useIsPhoneOrTablet } from "@/lib/device";
import { useDesktopLink } from "@/lib/useDesktopLink";

// Mobile hand-off banner. HireDrop applies from Chrome on a computer — a phone
// visitor can finish the whole setup here, but the launch happens on desktop.
// Say that honestly, give them a one-tap "email me the link", and — when a
// campaign is already live on their computer — point them to the phone's real
// superpower: approving applications from anywhere.
export default function MobileHandoff({ campaignRunning }: { campaignRunning: boolean }) {
  const mobile = useIsPhoneOrTablet();
  const link = useDesktopLink();

  if (!mobile) return null;

  return (
    <div className="mb-6 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/8 to-accent/[0.03] p-4">
      {campaignRunning ? (
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-xl leading-none mt-0.5">💻</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text">Campaign live on your computer</p>
            <p className="text-xs text-text2 mt-0.5">
              Keep it on with Chrome open. From your phone you can watch progress — and approve
              applications the moment they&apos;re prepared.
            </p>
            <a href="/dashboard/tap"
              className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold
                bg-accent text-white hover:bg-accent2 transition">
              Approve from your phone →
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-xl leading-none mt-0.5">📱</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text">You&apos;re on your phone — that&apos;s fine</p>
            <p className="text-xs text-text2 mt-0.5">
              Profile, résumé and preferences all work here. Applying runs from Chrome on your{" "}
              <strong className="text-text">computer</strong> — install the extension there and hit Start.
            </p>
            <button onClick={link.send} disabled={link.busy}
              className="mt-2.5 px-4 py-2 rounded-xl text-xs font-bold border border-accent/40 bg-surface
                text-accent hover:bg-accent/10 disabled:opacity-60 transition">
              {link.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
