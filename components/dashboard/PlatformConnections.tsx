"use client";

import { useEffect, useState } from "react";
import { PLATFORMS } from "@/lib/constants";

/**
 * Platform connection manager.
 *
 * Auto-apply only works when the user is logged into the platform in their
 * browser (the extension applies as them). This panel lets the user connect
 * each account-based platform up front — log in, or create a free account right
 * from here. The Chrome extension reports live login state for the platforms it
 * supports (Indeed, ZipRecruiter today); others show connect/sign-up actions and
 * gain live status as auto-apply support rolls out per platform.
 *
 * Reads status over the same window.postMessage bridge QuickActions uses
 * (ping.js relays it, reading chrome.storage.local directly).
 */

const CONNECTABLE = PLATFORMS.filter((p) => p.connectable);
const PUBLIC = PLATFORMS.filter((p) => !p.connectable);

type ConnStatus = "connected" | "logged_out" | undefined;

export default function PlatformConnections() {
  const [connections, setConnections] = useState<Record<string, { status: string }>>({});
  const [connReady, setConnReady] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== window || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "HIREDROP_PLATFORM_CONNECTIONS") {
        setConnReady(true);
        if (e.data.ok) setConnections(e.data.connections || {});
      }
    }
    window.addEventListener("message", onMsg);
    const ask = () => window.postMessage({ type: "HIREDROP_GET_PLATFORM_CONNECTIONS" }, "*");
    ask();
    const onVisible = () => { if (!document.hidden) ask(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const iv = setInterval(ask, 8000);
    return () => {
      window.removeEventListener("message", onMsg);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(iv);
    };
  }, []);

  function openUrl(url?: string) {
    if (url) window.open(url, "_blank", "noopener");
  }

  const connectedCount = CONNECTABLE.filter((p) => connections[p.id]?.status === "connected").length;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface2/40 transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Connect your job platforms</p>
            <p className="text-xs text-text2/70 truncate">
              Log in (or create a free account) so HireDrop can apply as you.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-text2/70">
            {connReady ? `${connectedCount}/${CONNECTABLE.length} connected` : `${CONNECTABLE.length} platforms`}
          </span>
          <svg className={`w-4 h-4 text-text2/50 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-border">
          {!connReady && (
            <p className="px-4 py-2.5 text-xs text-text2/60 bg-yellow/5 border-b border-border">
              Install & connect the HireDrop extension to see live connection status. You can still open each platform below to log in or register.
            </p>
          )}

          <ul className="divide-y divide-border">
            {CONNECTABLE.map((p) => {
              const status = connections[p.id]?.status as ConnStatus;
              const connected = status === "connected";
              const loggedOut = status === "logged_out";
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">{p.name}</span>
                      {p.autoApply ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                          auto-apply
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface2 text-text2/70 border border-border"
                          title="Connect now — auto-apply support is rolling out">
                          auto-apply soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text2/60 truncate">{p.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {connected ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Connected
                      </span>
                    ) : (
                      <>
                        {loggedOut && (
                          <span className="hidden sm:inline text-[11px] text-yellow font-medium mr-0.5">Not signed in</span>
                        )}
                        <button type="button" onClick={() => openUrl(p.loginUrl)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-surface
                            text-text hover:border-accent/40 hover:text-accent transition whitespace-nowrap">
                          Log in <span aria-hidden>↗</span>
                        </button>
                        <button type="button" onClick={() => openUrl(p.signupUrl)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-accent text-white
                            hover:bg-accent-hover transition whitespace-nowrap">
                          Sign up
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {PUBLIC.length > 0 && (
            <p className="px-4 py-2.5 text-[11px] text-text2/50 border-t border-border bg-surface2/20">
              No account needed: {PUBLIC.map((p) => p.name).join(", ")} — public listings you apply to directly.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
