"use client";

/*
  Drop on the dashboard.

  The character is real and shipping; the ANSWERS are not wired yet — there is no
  /buddy/ask endpoint behind this. Rather than fake a helpful reply (which would be
  worse than no chat at all — see the honest-metrics rule), the ask function says
  plainly that it can't answer yet and points at the surfaces that do have the data.

  When the backend lands, only `ask` changes; the character, moods and panel stay.

  Drop sits down at the desk ONLY when the server says a campaign is running — the same
  /campaign/status the dashboard polls. No timer, no guess: a character that "works"
  while nothing runs is exactly the lie the honest-metrics rule forbids. Until the
  first answer arrives (or if it fails) Drop stands — resting is the claim-free state.
*/

import { useEffect, useState } from "react";
import Buddy from "@/components/buddy/Buddy";
import { apiGet } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const NOT_WIRED =
  "I'm not connected to your account yet, so I can't really answer — and I won't make things up. " +
  "Your campaign and why it stopped are on the Dashboard; replies and employer questions are in History.";

const POLL_MS = 10_000;

export default function DashboardBuddy() {
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const { data: { session } } = await createClient().auth.getSession();
        const t = session?.access_token;
        if (!t) return;
        const s = await apiGet<{ running: boolean }>("/campaign/status", t);
        if (alive) setWorking(!!s.running);
      } catch { /* keep the last known state */ }
    }
    check();
    const poll = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      alive = false;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  return (
    <Buddy
      ask={async () => NOT_WIRED}
      greeting="Hi, I'm Drop. Soon I'll answer questions about your campaign — for now I just live here."
      suggestions={[]}
      working={working}
    />
  );
}
