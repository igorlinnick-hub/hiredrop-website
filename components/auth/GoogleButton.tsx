"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
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
 * Google only serves the button to origins listed as Authorized JavaScript
 * origins on the OAuth client (GCP project jobflow-491621). Anywhere else —
 * Vercel previews — and whenever the GIS script fails to load, the old
 * redirect button is rendered instead, so signing in never depends on it.
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
}: {
  intent: "signin" | "signup";
  /**
   * Where to land afterwards; null = the usual landing rule. Left out, the
   * page's own ?next= is used (the login page keeps one for where they were
   * headed before being sent to sign in).
   */
  next?: string | null;
}) {
  const supabase = createClient();
  const slot = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"pending" | "gis" | "redirect">("pending");
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
      setMode("redirect");
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
        if (!cancelled) setMode("redirect");
      }
    })();
    return () => {
      cancelled = true;
    };
    // Set up once per mount: supabase is a fresh client per render and
    // nextSuffix reads its inputs at click time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  async function handleRedirect() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback` + nextSuffix(),
      },
    });
  }

  return (
    <div className="space-y-2">
      {/* Google renders into this slot; it holds the button's height while
          the script loads so the form does not jump. */}
      <div
        ref={slot}
        className={mode === "redirect" ? "hidden" : "flex justify-center min-h-[44px]"}
        aria-busy={mode === "pending" || busy}
      />
      {mode === "redirect" && (
        <Button type="button" variant="secondary" fullWidth onClick={handleRedirect}>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </Button>
      )}
      {busy && <p className="text-center text-sm text-text2">Signing you in…</p>}
      {error && <p className="text-center text-sm text-red">{error}</p>}
    </div>
  );
}
