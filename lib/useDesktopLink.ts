import { useState } from "react";
import { apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export type DesktopLinkState = "idle" | "sending" | "sent" | "failed";

const LABELS: Record<DesktopLinkState, string> = {
  idle: "📧 Email me the desktop link",
  sending: "Sending…",
  sent: "Sent — open it on your computer ✓",
  failed: "Couldn’t send it. Tap to try again",
};

/**
 * Emails the signed-in address a link to open HireDrop on a computer, for the
 * phone and tablet screens where the extension can't run. A failed send stays on
 * screen as "failed" with the button live again, so the user knows to retry.
 */
export function useDesktopLink() {
  const [state, setState] = useState<DesktopLinkState>("idle");

  async function send() {
    if (state === "sending" || state === "sent") return;
    setState("sending");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) throw new Error("no session");
      await apiPost("/profile/send-desktop-link", session.access_token, {});
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  return { state, send, label: LABELS[state], busy: state === "sending" || state === "sent" };
}
