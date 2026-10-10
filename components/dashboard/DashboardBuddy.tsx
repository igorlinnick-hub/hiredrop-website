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

  Drop changes nothing himself. His cards are requests the person sends by pressing
  them, with their own session (`actions` below), the same calls Settings makes.
*/

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Buddy from "@/components/buddy/Buddy";
import { askDrop, sendDropFeedback } from "@/lib/buddy";
import { apiRequest } from "@/lib/api";
import type { AskFn, DropActions } from "@/components/buddy/BuddyPanel";
import { createClient } from "@/lib/supabase/client";
import { pollMaxAge, readCampaignStatus } from "@/lib/campaign/status";
import { replaceResume } from "@/lib/resume/replace";

const SESSION_EXPIRED = "Your session expired. Refresh the page and try again.";

async function sessionToken(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession();
  return session?.access_token ?? null;
}

const ask: AskFn = async (question, history, on, attachment) => {
  const token = await sessionToken();
  if (!token) return { text: "Your session expired. Refresh the page and ask me again." };
  return askDrop(
    token,
    question,
    history.map((m) => ({ role: m.role === "drop" ? "assistant" : "user", text: m.text })),
    on,
    attachment,
  );
};

const POLL_MS = 10_000;

export default function DashboardBuddy() {
  const [working, setWorking] = useState(false);
  const router = useRouter();

  const actions = useMemo<DropActions>(() => ({
    async call(method, path, body) {
      const token = await sessionToken();
      if (!token) throw Object.assign(new Error(SESSION_EXPIRED), { status: 401 });
      return apiRequest(method, path, token, body);
    },
    navigate: (path) => router.push(path),
    feedback(body) {
      sessionToken()
        .then((t) => (t ? sendDropFeedback(t, body) : null))
        .catch(() => { /* a lost vote costs a data point, never the chat */ });
    },
    async uploadResume(file) {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return SESSION_EXPIRED;
      const path = await replaceResume(supabase, session.user.id, session.access_token, file);
      return path ? null : "The upload didn't go through. Please try again.";
    },
  }), [router]);

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
      actions={actions}
      greeting="Hi, I'm Drop. I can see your campaign, applications and settings. Ask me why something stopped, or anything about HireDrop."
      suggestions={["Why did my campaign stop?", "Why so few applications today?", "What's waiting on me?"]}
      working={working}
    />
  );
}
