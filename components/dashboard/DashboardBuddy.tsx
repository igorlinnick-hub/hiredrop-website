"use client";

/*
  Drop on the dashboard — the support chat that can see the account.

  Answers come from POST /buddy/ask (jobflow modules/buddy.py): Claude with read-only
  tools over THIS user's campaign, run report, activity, applications and employer
  questions, and a fixed product-facts sheet — it explains what broke and what to click,
  and says "not sure" rather than inventing.

  Drop sits down at the desk in two honest cases only: the server says a campaign is
  running (/campaign/status, polled), or the chat backend is reading the account right
  now (the stream's `checking` state). Never on a timer.
*/

import { useEffect, useState } from "react";
import Buddy from "@/components/buddy/Buddy";
import { askDrop } from "@/lib/buddy";
import type { AskFn } from "@/components/buddy/BuddyPanel";
import { createClient } from "@/lib/supabase/client";
import { pollMaxAge, readCampaignStatus } from "@/lib/campaign/status";

const ask: AskFn = async (question, history, on) => {
  const { data: { session } } = await createClient().auth.getSession();
  const token = session?.access_token;
  if (!token) return "Your session expired — refresh the page and ask me again.";
  return askDrop(
    token,
    question,
    history.map((m) => ({ role: m.role === "drop" ? "assistant" : "user", text: m.text })),
    on,
  );
};

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
        const s = await readCampaignStatus(t, pollMaxAge(POLL_MS));
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
      ask={ask}
      greeting="Hi, I'm Drop. I can see your campaign, applications and settings — ask me why something stopped, or anything about HireDrop."
      suggestions={["Why did my campaign stop?", "Why so few applications today?", "What's waiting on me?"]}
      working={working}
    />
  );
}
