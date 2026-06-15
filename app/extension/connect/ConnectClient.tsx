"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type State = "detecting" | "extension-missing" | "storing" | "stored" | "failed";

interface Props {
  token: string;
  email: string;
}

export default function ConnectClient({ token, email }: Props) {
  const [state, setState] = useState<State>("detecting");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let pongReceived = false;
    let detectTimer: ReturnType<typeof setTimeout> | null = null;
    let storeTimer: ReturnType<typeof setTimeout> | null = null;

    function onMessage(e: MessageEvent) {
      if (e.source !== window || !e.data) return;

      if (e.data === "HIREDROP_PONG") {
        pongReceived = true;
        if (detectTimer) clearTimeout(detectTimer);
        setState("storing");
        window.postMessage({ type: "HIREDROP_STORE_TOKEN", token }, "*");
        storeTimer = setTimeout(() => {
          setState("failed");
          setErrorMsg("Extension responded to ping but never confirmed token storage. Try reloading the extension.");
        }, 5000);
        return;
      }

      if (typeof e.data === "object" && e.data.type === "HIREDROP_TOKEN_STORED") {
        if (storeTimer) clearTimeout(storeTimer);
        if (e.data.ok) {
          setState("stored");
        } else {
          setState("failed");
          setErrorMsg(e.data.error || "Extension rejected the token.");
        }
      }
    }

    window.addEventListener("message", onMessage);
    window.postMessage("HIREDROP_PING", "*");

    detectTimer = setTimeout(() => {
      if (!pongReceived) setState("extension-missing");
    }, 2500);

    return () => {
      window.removeEventListener("message", onMessage);
      if (detectTimer) clearTimeout(detectTimer);
      if (storeTimer) clearTimeout(storeTimer);
    };
  }, [token]);

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
            body="Install the HireDrop extension in Chrome, then reload this page."
            action={
              <Link
                href="/extension"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90"
              >
                Get the extension →
              </Link>
            }
          />
        )}

        {state === "storing" && (
          <Status
            tone="info"
            title="Connecting your account…"
            body="Passing your session to the extension. This takes about a second."
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
