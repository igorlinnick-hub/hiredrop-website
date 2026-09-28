"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import Button from "@/components/ui/Button";
import {
  ADS_OPTOUT_COOKIE,
  ADS_OPTOUT_EVENT,
  readCookie,
  setAdsOptOut,
} from "@/lib/adPixels";
import { createClient } from "@/lib/supabase/client";

const noSubscribe = () => () => {};
function subscribeOptOut(onChange: () => void) {
  window.addEventListener(ADS_OPTOUT_EVENT, onChange);
  return () => window.removeEventListener(ADS_OPTOUT_EVENT, onChange);
}
const readOptOutCookie = () => readCookie(document.cookie, ADS_OPTOUT_COOKIE) === "1";
const readGpc = () =>
  (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

type AccountSync = "checking" | "signed-out" | "saving" | "saved" | "failed";

/**
 * Read-merge-write `ads_optout` into the signed-in user's own
 * profiles.attribution, under their own session (RLS: own row only). The
 * backend reads it before reporting any conversion to Meta. Returns
 * "failed" when the row was not updated — RLS answers a refused update with
 * zero rows, not an error, so the row count is what gets checked.
 */
async function syncAccount(optOut: boolean | null): Promise<{
  state: "signed-out" | "saved" | "failed";
  accountOptedOut?: boolean;
}> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return { state: "signed-out" };

    const { data: row, error: readError } = await supabase
      .from("profiles")
      .select("attribution")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (readError || !row) return { state: "failed" };

    const raw = row.attribution as unknown;
    const current: Record<string, unknown> =
      raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};
    const accountOptedOut = current.ads_optout === true;
    // null = just read it; also nothing to write when it already says so.
    if (optOut === null || optOut === accountOptedOut) return { state: "saved", accountOptedOut };

    if (optOut) current.ads_optout = true;
    else delete current.ads_optout;
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ attribution: current })
      .eq("user_id", session.user.id)
      .select("user_id");
    if (error || !updated?.length) return { state: "failed", accountOptedOut };
    return { state: "saved", accountOptedOut: optOut };
  } catch {
    return { state: "failed" };
  }
}

export default function ChoicesClient() {
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  const cookieOptedOut = useSyncExternalStore(subscribeOptOut, readOptOutCookie, () => false);
  const gpc = useSyncExternalStore(noSubscribe, readGpc, () => false);
  const optedOut = cookieOptedOut || gpc;
  const [account, setAccount] = useState<AccountSync>("checking");

  // On arrival: are they signed in, and do the account and this browser
  // agree? An opt-out on either side wins: an account opted out elsewhere opts
  // this browser out, and a browser opted out (cookie or GPC — GPC is an
  // opt-out request from a known consumer once they are signed in) is applied
  // to the account.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const first = await syncAccount(null);
      if (cancelled) return;
      if (first.state !== "saved") {
        setAccount(first.state);
        return;
      }
      if (first.accountOptedOut && !readOptOutCookie()) setAdsOptOut(true);
      if ((readOptOutCookie() || readGpc()) && !first.accountOptedOut) {
        const applied = await syncAccount(true);
        if (!cancelled) setAccount(applied.state);
        return;
      }
      setAccount("saved");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    const next = !cookieOptedOut;
    setAdsOptOut(next);
    setAccount("saving");
    setAccount((await syncAccount(next)).state);
  }

  const gpcBlocksOptIn = gpc && cookieOptedOut;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-gray-900 font-semibold">
            Ad measurement in this browser:{" "}
            {inBrowser ? (optedOut ? "off — you're opted out" : "on") : "…"}
          </p>
          <p>
            Global Privacy Control:{" "}
            {inBrowser
              ? gpc
                ? "detected — you're opted out automatically."
                : "not detected."
              : "…"}
          </p>
        </div>
        {inBrowser && (
          <Button
            type="button"
            variant={cookieOptedOut ? "secondary" : "primary"}
            onClick={toggle}
            disabled={account === "saving" || gpcBlocksOptIn}
          >
            {cookieOptedOut ? "Opt back in" : "Opt out"}
          </Button>
        )}
      </div>

      {inBrowser && gpc && !cookieOptedOut && (
        <p>
          Your browser already opts you out. Pressing &ldquo;Opt out&rdquo; also keeps the choice
          here if you later turn GPC off.
        </p>
      )}
      {gpcBlocksOptIn && (
        <p>To opt back in, turn off Global Privacy Control in your browser first.</p>
      )}

      <p aria-live="polite">
        {account === "checking" && "Checking whether you're signed in…"}
        {account === "signed-out" &&
          "You're not signed in, so this applies to this browser only. Sign in and come back here to apply it to your account as well."}
        {account === "saving" && "Saving to your account…"}
        {account === "saved" &&
          (optedOut
            ? "Saved to your account: our server won't report your conversions to Meta."
            : "Your account is set to match this browser.")}
        {account === "failed" &&
          "Saved in this browser, but we couldn't update your account. Email support@hiredrop.io and we'll apply it by hand."}
      </p>
    </div>
  );
}
