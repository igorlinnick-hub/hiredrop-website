"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

// The live Chrome Web Store listing (kept in sync with components/extension/InstallFlow.tsx).
const CWS_URL =
  process.env.NEXT_PUBLIC_CWS_URL ||
  "https://chromewebstore.google.com/detail/hiredrop-%E2%80%94-auto-apply-on/bjideoimenmpcpnhppneehmjplkgkede";

type State = "waiting" | "linking" | "connected" | "failed";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

/**
 * MANDATORY final gate of onboarding. The campaign can't apply to anything until the
 * Chrome extension is installed AND linked to this account, so nobody reaches the
 * dashboard half-set-up.
 *
 * Laconic by design — one action ("Add to Chrome"). We ping for the extension forever
 * in the background (ping.js answers PONG); the moment it's present the page links the
 * account itself (durable key + session handoff, same as /extension/connect) and lights
 * up "Continue". A returning user who already has it connects instantly.
 *
 * First-install caveat (MV3): a freshly installed extension does NOT inject ping.js into
 * this already-open tab. So after the user installs and returns to this tab we reload
 * once — OnboardingWizard persists progress to localStorage, so the reload is lossless —
 * and the fresh page load has ping.js and links automatically.
 */
export default function StepConnectExtension({ onNext, onBack }: Props) {
  const [state, setState] = useState<State>("waiting");
  const [detail, setDetail] = useState("");
  const [installClicked, setInstallClicked] = useState(false);
  const linkingRef = useRef(false);

  // Persistent detect loop: keep pinging while we don't have the extension, so a PONG
  // that arrives later (returning user, or after a reload) still auto-links.
  useEffect(() => {
    let stopped = false;
    let cleanupLink: (() => void) | null = null;

    async function linkAccount() {
      if (linkingRef.current) return;
      linkingRef.current = true;
      setState("linking");

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const refreshToken = session?.refresh_token || "";
      if (!token) {
        linkingRef.current = false;
        setDetail("Your session expired — refresh the page and sign in again.");
        setState("failed");
        return;
      }

      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let giveUpTimer: ReturnType<typeof setTimeout> | null = null;
      const listeners: Array<(e: MessageEvent) => void> = [];
      cleanupLink = () => {
        if (pollTimer) clearInterval(pollTimer);
        if (giveUpTimer) clearTimeout(giveUpTimer);
        listeners.forEach((l) => window.removeEventListener("message", l));
      };

      const succeed = () => {
        cleanupLink?.();
        cleanupLink = null;
        try { sessionStorage.removeItem("hd_ob_ext_reloaded"); } catch { /* noop */ }
        setState("connected");
      };

      // Approach A: mint a DURABLE key (never expires, survives the tab closing) and
      // hand it over. The token push below is the transitional fallback.
      try {
        const res = await fetch(`${API_BASE}/api/v1/extension/issue-key`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.key) window.postMessage({ type: "HIREDROP_STORE_KEY", key: data.key }, "*");
        }
      } catch {
        /* fall back to token push */
      }

      const confirm = (e: MessageEvent) => {
        if (!e.data) return;
        const t = e.data.type;
        if (t !== "HIREDROP_KEY_STORED" && t !== "HIREDROP_TOKEN_STORED") return;
        if (e.data.ok && String(e.data.ping_status ?? "") === "200") succeed();
      };
      window.addEventListener("message", confirm);
      listeners.push(confirm);

      window.postMessage({ type: "HIREDROP_STORE_TOKEN", token, refresh_token: refreshToken }, "*");

      // Fallback: the SW pings the backend on STORE_TOKEN → goes "online".
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/v1/extension/ping`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok && (await res.json()).online) succeed();
        } catch { /* keep polling */ }
      }, 700);

      giveUpTimer = setTimeout(() => {
        cleanupLink?.();
        cleanupLink = null;
        linkingRef.current = false;
        setDetail("The extension didn’t confirm. Reload it in chrome://extensions, then it links automatically.");
        setState("failed");
      }, 20000);
    }

    const onMessage = (e: MessageEvent) => {
      if (e.source === window && e.data === "HIREDROP_PONG") void linkAccount();
    };
    window.addEventListener("message", onMessage);

    window.postMessage("HIREDROP_PING", "*");
    const ping = setInterval(() => {
      if (!stopped && !linkingRef.current) window.postMessage("HIREDROP_PING", "*");
    }, 1200);

    return () => {
      stopped = true;
      clearInterval(ping);
      window.removeEventListener("message", onMessage);
      cleanupLink?.();
    };
  }, []);

  // After the user goes off to install, reload once when they return to this tab so the
  // freshly installed extension's ping.js gets injected. Guarded so it fires at most once.
  useEffect(() => {
    if (!installClicked) return;
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      if (linkingRef.current || state === "connected") return;
      try {
        if (sessionStorage.getItem("hd_ob_ext_reloaded")) return;
        sessionStorage.setItem("hd_ob_ext_reloaded", "1");
      } catch { /* private mode — fall through to manual button */ }
      window.location.reload();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [installClicked, state]);

  function refreshNow() {
    try { sessionStorage.setItem("hd_ob_ext_reloaded", "1"); } catch { /* noop */ }
    window.location.reload();
  }

  const connected = state === "connected";
  const showInstall = state === "waiting" || state === "failed";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center gap-7 md:gap-9">
        {/* Original animated visual */}
        <div className="order-1 md:order-2 shrink-0 mx-auto md:mx-0 w-40 sm:w-48">
          <ExtensionConnectVisual state={state} />
        </div>

        {/* Text + actions — side format, left-aligned */}
        <div className="order-2 md:order-1 flex-1 space-y-5 text-left">
          <div className="space-y-2">
            <h2 className="text-[1.7rem] leading-tight font-bold text-text">
              One last step —<br className="hidden sm:block" /> connect the extension
            </h2>
            <p className="text-sm text-text2 max-w-sm">
              HireDrop applies from <strong className="text-text">your own browser</strong>, so it
              lives as a Chrome extension. Add it and this page links your account automatically.
            </p>
          </div>

          {showInstall && (
            <div className="space-y-2.5">
              <a
                href={CWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setInstallClicked(true)}
                className="group inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-accent text-white
                  text-[0.95rem] font-semibold shadow-sm hover:bg-accent2 transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="21.17" y1="8" x2="12" y2="8" />
                  <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                  <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
                </svg>
                Add to Chrome — it’s free
                <span className="opacity-70 group-hover:translate-x-0.5 transition">↗</span>
              </a>
              <div>
                <button
                  onClick={refreshNow}
                  className="text-xs font-medium text-text2 hover:text-accent underline underline-offset-2 transition"
                >
                  Already added it? ↻ Refresh to detect
                </button>
              </div>
            </div>
          )}

          {/* Live status pill */}
          <div>
            <span className={[
              "inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium border",
              connected
                ? "border-green/30 bg-green/10 text-green"
                : state === "failed"
                ? "border-red/30 bg-red/10 text-red"
                : "border-border bg-surface2/50 text-text2",
            ].join(" ")}>
              <span className="relative flex h-2.5 w-2.5">
                {!connected && state !== "failed" && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                )}
                <span className={[
                  "relative inline-flex h-2.5 w-2.5 rounded-full",
                  connected ? "bg-green" : state === "failed" ? "bg-red" : "bg-accent",
                ].join(" ")} />
              </span>
              {state === "waiting" && "Waiting for the extension…"}
              {state === "linking" && "Linking your account…"}
              {connected && "Extension connected ✓"}
              {state === "failed" && (detail || "Couldn’t link — reload the extension")}
            </span>
          </div>

          <p className="text-xs text-text2/60">Requires Google Chrome on a desktop computer.</p>
        </div>
      </div>

      {/* Nav spans the full width below both columns */}
      <div className="flex justify-between items-center">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!connected}>
          {connected ? "Continue →" : "Connect to continue"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Original, self-contained illustration: the HireDrop extension (a puzzle chip, the
 * universal browser-extension symbol) rides a pulsing beam up and clicks into the real
 * Chrome logo. On connect the beam turns green and a check badge pops. Pure SVG + CSS
 * (transform/opacity only), theme-aware via the app's tokens, driven by `state`.
 */
function ExtensionConnectVisual({ state }: { state: State }) {
  return (
    <div data-state={state} className="hdext w-full">
      <style>{`
        .hdext svg { width: 100%; height: auto; display: block; }
        .hdext .beam-flow { opacity: 0; }
        .hdext .ring { transform-origin: 100px 62px; opacity: 0; }
        .hdext .glow { transform-origin: 100px 62px; opacity: 0; }
        .hdext .chip-pos { transform: translateY(30px); transition: transform 1.1s cubic-bezier(.34,1.25,.5,1); }
        .hdext .chip-bob { transform-origin: 100px 170px; }
        .hdext .check-badge { opacity: 0; transform: scale(.3); transform-origin: 148px 78px; }

        /* WAITING / FAILED — searching */
        .hdext[data-state="waiting"] .chip-bob,
        .hdext[data-state="failed"] .chip-bob { animation: hdBob 2.6s ease-in-out infinite; }
        .hdext[data-state="waiting"] .ring,
        .hdext[data-state="failed"] .ring { animation: hdRing 2.3s ease-out infinite; }
        .hdext[data-state="waiting"] .beam-flow,
        .hdext[data-state="failed"] .beam-flow { animation: hdFlow 2.1s linear infinite; }

        /* LINKING — chip rises, beam races */
        .hdext[data-state="linking"] .chip-pos { transform: translateY(0); }
        .hdext[data-state="linking"] .ring { animation: hdRing 1.1s ease-out infinite; }
        .hdext[data-state="linking"] .beam-flow { animation: hdFlow .85s linear infinite; }

        /* CONNECTED — seated + green + check */
        .hdext[data-state="connected"] .chip-pos { transform: translateY(0); }
        .hdext[data-state="connected"] .beam-flow { opacity: 0; }
        .hdext[data-state="connected"] .beam-line { stroke: var(--green); transition: stroke .5s ease; }
        .hdext[data-state="connected"] .check-badge { animation: hdCheck .5s cubic-bezier(.2,1.5,.4,1) .1s forwards; }
        .hdext[data-state="connected"] .glow { animation: hdGlow .8s ease-out; }

        @keyframes hdBob { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-4px) } }
        @keyframes hdRing { 0%{ transform: scale(.72); opacity:.5 } 100%{ transform: scale(1.28); opacity:0 } }
        @keyframes hdFlow { 0%{ opacity:0; transform: translateY(0) } 18%{ opacity:1 } 82%{ opacity:1 } 100%{ opacity:0; transform: translateY(-40px) } }
        @keyframes hdCheck { to { opacity:1; transform: scale(1) } }
        @keyframes hdGlow { 0%{ opacity:.5; transform: scale(.8) } 100%{ opacity:0; transform: scale(1.5) } }
        @media (prefers-reduced-motion: reduce) {
          .hdext * { animation: none !important; transition: none !important; }
          .hdext .chip-pos { transform: translateY(0); }
        }
      `}</style>

      <svg viewBox="0 0 200 210" fill="none" xmlns="http://www.w3.org/2000/svg" role="img"
        aria-label="The HireDrop extension connecting to Chrome">
        {/* search ring + connect burst around the Chrome logo */}
        <circle className="ring" cx="100" cy="62" r="46" stroke="var(--accent)" strokeWidth="1.5" />
        <circle className="glow" cx="100" cy="62" r="42" fill="var(--green)" />

        {/* ---- Chrome logo ---- */}
        <g>
          <circle cx="100" cy="62" r="37" fill="#fff" />
          {/* red (top), yellow (lower-right), green (lower-left) sectors */}
          <path d="M100 62 L68.82 44 A36 36 0 0 1 131.18 44 Z" fill="#EA4335" />
          <path d="M100 62 L131.18 44 A36 36 0 0 1 100 98 Z" fill="#FBBC05" />
          <path d="M100 62 L100 98 A36 36 0 0 1 68.82 44 Z" fill="#34A853" />
          {/* white ring + blue hub */}
          <circle cx="100" cy="62" r="15" fill="#fff" />
          <circle cx="100" cy="62" r="11" fill="#4285F4" />
        </g>

        {/* connection beam from the chip up to Chrome */}
        <line className="beam-line" x1="100" y1="150" x2="100" y2="104" stroke="var(--border)"
          strokeWidth="2" strokeLinecap="round" />
        <g>
          <circle className="beam-flow" cx="100" cy="146" r="3" fill="var(--accent)" style={{ animationDelay: "0s" }} />
          <circle className="beam-flow" cx="100" cy="146" r="3" fill="var(--accent)" style={{ animationDelay: ".5s" }} />
          <circle className="beam-flow" cx="100" cy="146" r="3" fill="var(--accent)" style={{ animationDelay: "1s" }} />
        </g>

        {/* ---- Extension chip (puzzle piece) that rises into Chrome ---- */}
        <g className="chip-pos">
          <g className="chip-bob">
            {/* body */}
            <rect x="80" y="160" width="40" height="34" rx="9" fill="var(--accent)" />
            {/* top knob */}
            <circle cx="100" cy="158" r="8" fill="var(--accent)" />
            {/* right socket (carved with the card bg) */}
            <circle cx="120" cy="177" r="6" fill="var(--surface)" />
            {/* left knob */}
            <circle cx="80" cy="177" r="6" fill="var(--accent)" />
          </g>
        </g>

        {/* success check badge (bottom-right of the Chrome logo) */}
        <g className="check-badge">
          <circle cx="148" cy="78" r="13" fill="var(--green)" stroke="#fff" strokeWidth="2.5" />
          <path d="M142 78l4 4 8-8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"
            strokeLinejoin="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}
