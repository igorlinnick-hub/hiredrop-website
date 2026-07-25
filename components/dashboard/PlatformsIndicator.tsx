"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PLATFORMS } from "@/lib/constants";

// Compact dashboard pill that replaces the full PlatformConnections panel — the
// panel now lives on its own /dashboard/platforms tab. Reads the same live login
// state over the ping.js bridge and shows "N/M connected" with a link to manage.

const CONNECTABLE = PLATFORMS.filter((p) => p.connectable);
const CONN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Conn = { status?: string; checkedAt?: string };
function isLiveConnected(c?: Conn): boolean {
  if (!c?.status) return false;
  if (c.checkedAt && Date.now() - Date.parse(c.checkedAt) > CONN_TTL_MS) return false;
  return c.status === "connected";
}

export default function PlatformsIndicator() {
  const [connections, setConnections] = useState<Record<string, Conn>>({});
  const [connReady, setConnReady] = useState(false);

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
    const iv = setInterval(ask, 10000);
    return () => {
      window.removeEventListener("message", onMsg);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(iv);
    };
  }, []);

  const connected = CONNECTABLE.filter((p) => isLiveConnected(connections[p.id])).length;
  const total = CONNECTABLE.length;
  const allSet = connReady && connected === total;
  const noneYet = connReady && connected === 0;

  return (
    <Link href="/dashboard/platforms"
      className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3
        hover:border-accent/40 hover:bg-surface2/40 transition group">
      <span className={[
        "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
        allSet ? "bg-green/10 text-green" : "bg-accent/10 text-accent",
      ].join(" ")}>
        <svg className="w-4.5 h-4.5" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">Job platforms</p>
        <p className="text-xs text-text2/70 truncate">
          {!connReady
            ? "Connect your accounts so HireDrop can apply as you"
            : allSet
            ? "All accounts connected — you're ready to apply"
            : noneYet
            ? "Connect an account so HireDrop can apply as you"
            : "Log in to more platforms to widen your reach"}
        </p>
      </div>

      {/* Count pill */}
      {connReady && (
        <span className={[
          "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
          allSet ? "bg-green/10 text-green border-green/20" : "bg-surface2 text-text2 border-border",
        ].join(" ")}>
          <span className={`w-1.5 h-1.5 rounded-full ${allSet ? "bg-green" : "bg-accent"}`} />
          {connected}/{total} connected
        </span>
      )}

      <svg className="w-4 h-4 text-text2/40 group-hover:text-accent group-hover:translate-x-0.5 transition shrink-0"
        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
