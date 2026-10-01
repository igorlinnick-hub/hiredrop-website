"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/gate/landing";

/**
 * "Sign in with Google" that never leaves hiredrop.io.
 *
 * The old button was supabase.auth.signInWithOAuth: Google sends its answer to
 * msxjcjzmfruizbgkssxo.supabase.co/auth/v1/callback, and an unverified app is
 * named on Google's screen by that redirect domain — so a visitor read "Sign in
 * to msxjcjzmfruizbgkssxo.supabase.co" and, fairly, took it for a scam (30.09).
 *
 * Here Google Identity Services draws the button on our page, hands the ID
 * token back to this page, and Supabase turns it into a session
 * (signInWithIdToken). Google's dialog is tied to hiredrop.io; once the consent
 * screen passes brand verification it says "HireDrop" with our logo.
 *
 * There is deliberately no redirect fallback. Brand verification needs every
 * authorized domain on the consent screen to be one we own, and the redirect
 * flow needs supabase.co among them — so that redirect URI is gone from the
 * OAuth client and signInWithOAuth would only end on redirect_uri_mismatch.
 *
 * Google only serves the button to origins listed as Authorized JavaScript
 * origins on the OAuth client (GCP project jobflow-491621). Anywhere else —
 * Vercel previews — the block renders nothing and email + password remain.
 * If the GIS script does not load (network, a strict blocker) it says so and
 * offers a retry instead of a dead button.
 */

// Public by design — it is in every Google sign-in URL. Same Web client that
// Supabase's Google provider is configured with, so Supabase accepts its tokens.
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "492631360560-1ad83crkl30kqlmthustut3sogjckc03.apps.googleusercontent.com";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const GIS_ORIGINS = ["hiredrop.io", "www.hiredrop.io", "localhost"];
const GIS_LOAD_TIMEOUT_MS = 5000;

interface GisCredentialResponse {
  credential: string;
}
interface GisApi {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (r: GisCredentialResponse) => void;
        nonce: string;
        auto_select?: boolean;
      }): void;
      renderButton(el: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}
declare global {
  interface Window {
    google?: GisApi;
  }
}

function loadGis(): Promise<GisApi> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("gis timeout")), GIS_LOAD_TIMEOUT_MS);
    const done = () => {
      window.clearTimeout(timer);
      if (window.google?.accounts?.id) resolve(window.google);
      else reject(new Error("gis missing"));
    };
    let script = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      script?.remove();
      reject(new Error("gis failed to load"));
    }, { once: true });
  });
}

/**
 * Google puts the SHA-256 of the nonce we give it into the ID token; Supabase
 * is handed the raw value and checks the hash, so a token lifted from
 * somewhere else cannot be replayed into a session here.
 */
async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}

export default function GoogleButton({
  intent,
  next,
  divider,
}: {
  intent: "signin" | "signup";
  /** Text on the rule above the button; hidden together with it. */
  divider: string;
  /**
   * Where to land afterwards; null = the usual landing rule. Left out, the
   * page's own ?next= is used (the login page keeps one for where they were
   * headed before being sent to sign in).
   */
  next?: string | null;
}) {
  const supabase = createClient();
  const slot = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"pending" | "gis" | "failed" | "off">("pending");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Read at click time, not render time — window is not there during prerender.
  const nextSuffix = () => {
    const dest =
      next !== undefined ? next : safeNextPath(new URLSearchParams(window.location.search).get("next"));
    return dest ? `?next=${encodeURIComponent(dest)}` : "";
  };

  useEffect(() => {
    if (!GIS_ORIGINS.includes(window.location.hostname) || !window.crypto?.subtle) {
      setMode("off");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [gis, nonce] = await Promise.all([loadGis(), makeNonce()]);
        if (cancelled || !slot.current) return;
        gis.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hashed,
          auto_select: false,
          callback: async ({ credential }) => {
            setBusy(true);
            setError("");
            const { error: authError } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: credential,
              nonce: nonce.raw,
            });
            if (authError) {
              setError(authError.message);
              setBusy(false);
              return;
            }
            // The session is in cookies now; /auth/finish does what the
            // OAuth callback did after its exchange (attribution, landing,
            // sign-up conversion).
            window.location.href = "/auth/finish" + nextSuffix();
          },
        });
        gis.accounts.id.renderButton(slot.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: intent === "signup" ? "signup_with" : "signin_with",
          logo_alignment: "center",
          // GIS caps the width at 400px and does not stretch to its parent.
          width: Math.min(400, slot.current.offsetWidth || 400),
        });
        setMode("gis");
      } catch {
        if (!cancelled) setMode("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
    // Set up once per mount: supabase is a fresh client per render and
    // nextSuffix reads its inputs at click time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, attempt]);

  if (mode === "off") return null;

  return (
    <div className="space-y-2">
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-4 text-text2">{divider}</span>
        </div>
      </div>
      {/* Google renders into this slot; it holds the button's height while
          the script loads so the form does not jump. */}
      <div
        ref={slot}
        className={mode === "failed" ? "hidden" : "flex justify-center min-h-[44px]"}
        aria-busy={mode === "pending" || busy}
      />
      {mode === "failed" && (
        <p className="text-center text-sm text-text2">
          Google sign-in didn&apos;t load &mdash; a network hiccup or a content blocker.{" "}
          <button
            type="button"
            className="text-accent hover:text-accent2 font-medium"
            onClick={() => {
              setMode("pending");
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </p>
      )}
      {busy && <p className="text-center text-sm text-text2">Signing you in…</p>}
      {error && <p className="text-center text-sm text-red">{error}</p>}
    </div>
  );
}
