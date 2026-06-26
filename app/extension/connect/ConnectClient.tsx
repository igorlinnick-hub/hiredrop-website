"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

type State = "detecting" | "extension-missing" | "storing" | "stored" | "failed";

interface Props {
  token: string;
  refreshToken: string;
  email: string;
}

export default function ConnectClient({ token, refreshToken, email }: Props) {
  const [state, setState] = useState<State>("detecting");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    // Extension manifest only covers hiredrop.io — silently redirect if on wrong domain
    const h = window.location.hostname;
    if (h !== "hiredrop.io" && !h.endsWith(".hiredrop.io")) {
      window.location.replace("https://hiredrop.io/extension/connect");
      return;
    }

    let pongReceived = false;
    let detectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let giveUpTimer: ReturnType<typeof setTimeout> | null = null;

    function clearDetect() {
      if (retryTimer) clearInterval(retryTimer);
      if (detectTimer) clearTimeout(detectTimer);
    }
    function clearStore() {
      if (pollTimer) clearInterval(pollTimer);
      if (giveUpTimer) clearTimeout(giveUpTimer);
    }

    async function pollExtensionOnline() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/extension/ping`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return false;
        const data = await res.json();
        return !!data.online;
      } catch {
        return false;
      }
    }

    function startStoringPhase() {
      setState("storing");
      window.postMessage({ type: "HIREDROP_STORE_TOKEN", token, refresh_token: refreshToken }, "*");

      let diagMsg = "";
      // Listen for TOKEN_STORED callback.
      // If SW confirms backend ping (ping_status==="200"), trust it immediately —
      // no need to wait for the GET-poll round-trip via in-memory _ext_status.
      // GET-poll below stays as fallback for extension builds without ping_status.
      const tokenStoredListener = (e: MessageEvent) => {
        if (!e.data || e.data.type !== "HIREDROP_TOKEN_STORED") return;
        const ps = e.data.ping_status ?? "no_ps";
        const err = e.data.error ?? null;
        window.removeEventListener("message", tokenStoredListener);
        if (e.data.ok && ps === "200") {
          // SW pinged backend successfully — we're done.
          clearStore();
          setState("stored");
          return;
        }
        if (!e.data.ok) {
          diagMsg = `SW error: ${err || "unknown"}`;
        } else {
          diagMsg = `SW ping: ${ps}`;
        }
      };
      window.addEventListener("message", tokenStoredListener);

      // Poll backend every 500ms; extension pings backend on STORE_TOKEN → confirms online
      pollTimer = setInterval(async () => {
        const online = await pollExtensionOnline();
        if (online) {
          clearStore();
          setState("stored");
        }
      }, 500);

      // Give up after 20s — generous for slow SW wake-ups
      giveUpTimer = setTimeout(() => {
        clearStore();
        setState("failed");
        setErrorMsg(
          diagMsg
            ? `Connection timed out. Diagnostic: ${diagMsg}`
            : "Extension didn't confirm connection within 20 seconds. Reload the extension and try again."
        );
      }, 20000);
    }

    function onMessage(e: MessageEvent) {
      if (e.source !== window || !e.data) return;

      if (e.data === "HIREDROP_PONG") {
        if (pongReceived) return;
        pongReceived = true;
        clearDetect();
        startStoringPhase();
      }
    }

    window.addEventListener("message", onMessage);

    // Retry PING every 400ms — ping.js content script may not be ready on the first fire
    // (document_idle injection can race with React hydration)
    window.postMessage("HIREDROP_PING", "*");
    retryTimer = setInterval(() => {
      if (!pongReceived) window.postMessage("HIREDROP_PING", "*");
    }, 400);

    // Give up after 5 seconds total
    detectTimer = setTimeout(() => {
      clearDetect();
      if (!pongReceived) setState("extension-missing");
    }, 5000);

    return () => {
      window.removeEventListener("message", onMessage);
      clearDetect();
      clearStore();
    };
  }, [token, refreshToken]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-text">
            <span className="text-accent">Hire</span>Drop
          </span>
          <span className="ml-auto text-xs text-text2">{email}</span>
        </div>

        {state === "detecting" && (
          <Status
            tone="info"
            title="Looking for the extension…"
            body="Make sure the HireDrop extension is installed and enabled in Chrome."
          />
        )}

        {state === "extension-missing" && (
          <Status
            tone="warning"
            title="Extension not detected"
            body="Open this page from the extension popup (Connect Account button), or make sure the extension is enabled in Chrome."
            action={
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90"
                >
                  Try Again
                </button>
                <Link
                  href="/extension"
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-text text-sm font-medium hover:bg-surface2"
                >
                  Get the extension →
                </Link>
              </div>
            }
          />
        )}

        {state === "storing" && (
          <Status
            tone="info"
            title="Connecting your account…"
            body="Passing your session to the extension and waiting for confirmation. This usually takes 2–5 seconds."
          />
        )}

        {state === "stored" && (
          <Status
            tone="success"
            title="Extension connected ✓"
            body="Your account is now linked. You can close this tab and start applying."
            action={
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90"
              >
                Back to dashboard
              </Link>
            }
          />
        )}

        {state === "failed" && (
          <Status
            tone="error"
            title="Connection failed"
            body={errorMsg || "Something went wrong. Reload this page or reinstall the extension."}
            action={
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-text text-sm font-medium hover:bg-surface2"
              >
                Try again
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}

function Status({
  tone,
  title,
  body,
  action,
}: {
  tone: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const toneStyles: Record<string, string> = {
    info: "border-accent/40 bg-accent/5",
    success: "border-green/40 bg-green/5",
    warning: "border-amber-400/40 bg-amber-50",
    error: "border-red/40 bg-red/5",
  };
  return (
    <div className={`rounded-lg border ${toneStyles[tone]} p-4 space-y-3`}>
      <p className="font-semibold text-text">{title}</p>
      <p className="text-sm text-text2">{body}</p>
      {action}
    </div>
  );
}
