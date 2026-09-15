"use client";

/**
 * Dev panel — the controls a driver needs and a user must never see.
 *
 * Two things were built but had no way to reach them from the dashboard:
 *
 *  1. The extension already reports its version on every /extension/ping, and
 *     GET /extension/ping hands it back. Nothing displayed it, so "is the running
 *     extension the code I just wrote?" had no answer short of asking Igor to read
 *     chrome://extensions. A stale extension is the #1 false negative in this repo:
 *     the server half of a fix ships, the pool shows nothing, and the server gets
 *     blamed (jobflow/CLAUDE.md traps 1-2).
 *
 *  2. background.js has DEV_RELOAD, which reloads the unpacked extension from disk —
 *     the manual OFF/ON at chrome://extensions, which no script can click because
 *     JS cannot be injected into chrome:// pages. The bridge relays it. No button
 *     ever sent it.
 *
 * Gate: localStorage "hd_dev" === "1", set by visiting /dashboard?dev=1. Deliberately
 * not an env flag — this has to work on production, because production is where the
 * real extension and the real session live. No user stumbles into localStorage.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { apiGet } from "@/lib/api";

type ExtStatus = {
  online?: boolean;
  version?: string | null;
  instance_id?: string | null;
  last_seen_secs_ago?: number;
  campaign_running?: boolean | null;
};

// The gate is external state (localStorage), so it's read through
// useSyncExternalStore rather than mirrored into React state in an effect — the
// effect below only WRITES to localStorage, which is what effects are for.
const gateListeners = new Set<() => void>();

function subscribeGate(cb: () => void) {
  gateListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    gateListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function gateSnapshot(): boolean {
  try {
    return localStorage.getItem("hd_dev") === "1";
  } catch {
    return false; // private mode / storage blocked — stay hidden
  }
}

export default function DevPanel({ token }: { token: string }) {
  const on = useSyncExternalStore(subscribeGate, gateSnapshot, () => false);
  const [ext, setExt] = useState<ExtStatus | null>(null);
  const [note, setNote] = useState<string>("");

  // ?dev=1 turns the panel on for this browser, ?dev=0 off.
  useEffect(() => {
    try {
      const flag = new URL(window.location.href).searchParams.get("dev");
      if (flag !== "1" && flag !== "0") return;
      if (flag === "1") localStorage.setItem("hd_dev", "1");
      else localStorage.removeItem("hd_dev");
      gateListeners.forEach((cb) => cb());
    } catch {
      /* storage blocked — the gate stays closed */
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!on || !token) return;
    try {
      setExt(await apiGet<ExtStatus>("/extension/ping", token));
    } catch {
      setExt(null); // offline/401 — the panel says "offline", which is the useful answer
    }
  }, [on, token]);

  useEffect(() => {
    if (!on) return;
    // Both scheduled, never called straight from the effect body: a synchronous
    // setState there cascades renders (react-hooks/set-state-in-effect).
    const first = setTimeout(refresh, 0);
    const iv = setInterval(refresh, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [on, refresh]);

  if (!on) return null;

  // Reloading the extension kills THIS page's content script with it, so the bridge is
  // dead until the page reloads. Say so, and reload on a delay rather than leaving a
  // silently broken tab that looks fine.
  function reloadExtension() {
    setNote("reloading extension… page refreshes in 4s");
    window.postMessage({ type: "HIREDROP_DEV_RELOAD" }, "*");
    setTimeout(() => window.location.reload(), 4000);
  }

  const stale = !ext?.online;

  return (
    <div
      className="mb-4 rounded-xl border border-dashed border-accent/40 bg-accent/[0.04] px-3 py-2"
      data-testid="dev-panel"
    >
      <div
        hidden
        data-testid="ext-state"
        data-online={ext?.online ? "true" : "false"}
        data-version={ext?.version ?? ""}
        data-instance={ext?.instance_id ?? ""}
        data-last-seen={ext?.last_seen_secs_ago != null ? String(ext.last_seen_secs_ago) : ""}
        data-campaign-running={ext?.campaign_running ? "true" : "false"}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <span className="font-semibold text-accent">dev</span>
        <span className={stale ? "text-red" : "text-text2"}>
          extension {ext?.online ? `v${ext.version ?? "?"} online` : "offline / never pinged"}
          {ext?.last_seen_secs_ago != null && ` · seen ${ext.last_seen_secs_ago}s ago`}
        </span>
        <button
          type="button"
          onClick={reloadExtension}
          data-testid="btn-ext-reload"
          className="rounded-lg border border-border bg-surface px-2 py-1 font-medium text-text
            hover:border-accent/40 transition"
        >
          Reload extension
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          data-testid="btn-page-reload"
          className="rounded-lg border border-border bg-surface px-2 py-1 font-medium text-text
            hover:border-accent/40 transition"
        >
          Reload page
        </button>
        {note && <span className="text-text2" data-testid="dev-note">{note}</span>}
      </div>
    </div>
  );
}
