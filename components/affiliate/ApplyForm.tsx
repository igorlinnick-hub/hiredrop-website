"use client";

// The application form. Six questions, because a human reads every one of them
// to decide whether to trust someone with a link — this is not a survey to be
// aggregated, and every extra field is a person who closes the tab.
//
// It lives INSIDE the account (2026-09-24). The public /affiliate/apply page it
// used to sit on now routes through signup, which removes the failure where
// someone applied with one email, signed up with another, and ended up approved
// with a link attached to nobody — invisible from every screen they could see.

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

/** Mirrors the backend's rule (and the database's CHECK) so the applicant is
 *  told here, not after pressing send. */
const CODE_RE = /^[a-z0-9][a-z0-9._-]{1,38}$/;

interface Props {
  /** Which door they came through — ?src=card from the printed QR. */
  source: string;
}

export default function ApplyForm({ source }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    desired_code: "",
    audience: "",
    audience_size: "",
    promo_plan: "",
    paypal_email: "",
    website: "", // honeypot — hidden from people, filled by bots
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Set when they are signed in. The approved code attaches to an account BY
  // EMAIL, so an applicant who types a different address than the one they log
  // in with ends up with an account and no link — and no way to work out why.
  // For them the field is their account's address and nothing else.
  const [accountEmail, setAccountEmail] = useState("");

  useEffect(() => {
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const mail = data.user?.email ?? "";
        if (!alive || !mail) return;
        setAccountEmail(mail);
        setForm((f) => ({ ...f, email: mail }));
      })
      .catch(() => {
        // Signed out, or auth unreachable — the free-text field is the fallback.
      });
    return () => {
      alive = false;
    };
  }, []);

  const code = form.desired_code.trim().toLowerCase();
  const codeBad = code.length > 0 && !CODE_RE.test(code);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/affiliate/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, desired_code: code, source }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Something went wrong. Try again in a moment.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="hd-glass rounded-2xl p-8 text-center">
        <h2 className="text-xl font-semibold text-text">
          Got it — we&apos;ll read it ourselves
        </h2>
        <p className="text-text2 text-sm mt-3 max-w-md mx-auto">
          Every application is reviewed by a person, usually within a day or two. If it&apos;s a
          yes, your link — <span className="font-medium text-text">
          hiredrop.io/?ref={code || "yourname"}</span> — arrives by email and appears on this page,
          with your opens, referrals and earnings next to it.
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-border bg-surface2/60 px-4 py-3 text-sm text-text placeholder-text2/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
  const label =
    "block text-sm font-medium text-text mb-1.5";
  const hint = "text-xs text-text2 mt-1.5";

  return (
    <form onSubmit={submit} className="hd-glass rounded-2xl p-6 sm:p-7 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={label} htmlFor="name">Your name</label>
          <input id="name" required maxLength={120} className={field} value={form.name}
                 onChange={(e) => set("name", e.target.value)} placeholder="Luca Moretti" />
        </div>
        <div>
          <label className={label} htmlFor="email">Email</label>
          <input id="email" required type="email" maxLength={254} className={field} value={form.email}
                 onChange={(e) => set("email", e.target.value)} placeholder="you@university.edu"
                 readOnly={!!accountEmail} aria-readonly={!!accountEmail} />
          <p className={hint}>Your HireDrop account&apos;s email — your link attaches to this account.</p>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="code">The link you want</label>
        <div className="flex items-center rounded-xl border border-border bg-surface2/60 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <span className="pl-4 text-sm text-text2/70 select-none">
            hiredrop.io/?ref=
          </span>
          <input id="code" required maxLength={39}
                 className="flex-1 bg-transparent px-2 py-3 text-sm text-text placeholder-text2/60 focus:outline-none"
                 value={form.desired_code}
                 onChange={(e) => set("desired_code", e.target.value)} placeholder="luca" />
        </div>
        {codeBad ? (
          <p className="text-xs text-red mt-1.5">
            Lowercase letters, numbers, dot, dash and underscore only — at least 2 characters.
          </p>
        ) : (
          <p className={hint}>This is yours: everyone who signs up through it counts as your referral.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={label} htmlFor="audience">Where will you share it?</label>
          <input id="audience" maxLength={2000} className={field} value={form.audience}
                 onChange={(e) => set("audience", e.target.value)}
                 placeholder="@myhandle on TikTok / my university's career group" />
          <p className={hint}>A link or handle helps — we do look.</p>
        </div>
        <div>
          <label className={label} htmlFor="size">How many people is that?</label>
          <input id="size" maxLength={200} className={field} value={form.audience_size}
                 onChange={(e) => set("audience_size", e.target.value)}
                 placeholder="3k followers / a class of 40" />
          <p className={hint}>Rough is fine. Small and real beats big and vague.</p>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="plan">How do you plan to talk about it?</label>
        <textarea id="plan" rows={3} maxLength={2000} className={field} value={form.promo_plan}
                  onChange={(e) => set("promo_plan", e.target.value)}
                  placeholder="A short video about how long applying takes, with the link in bio." />
      </div>

      <div>
        <label className={label} htmlFor="paypal">PayPal email for payouts</label>
        <input id="paypal" type="email" maxLength={254} className={field} value={form.paypal_email}
               onChange={(e) => set("paypal_email", e.target.value)} placeholder="you@gmail.com" />
        <p className={hint}>Optional now — but we can&apos;t pay you without it later.</p>
      </div>

      {/* Honeypot. Hidden from people; bots fill every input they find. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
             className="hidden" value={form.website} onChange={(e) => set("website", e.target.value)} />

      {error && (
        <p className="rounded-xl border border-red/30 bg-red/10 px-4 py-3 text-sm text-text">
          {error}
        </p>
      )}

      <div>
        <button type="submit" disabled={sending || codeBad}
                className="w-full sm:w-auto bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold px-8 py-3.5 rounded-xl transition">
          {sending ? "Sending…" : "Apply for a link"}
        </button>
        <p className="text-text2 text-xs mt-4">
          When you share your link you must say you earn a commission — &ldquo;I get a cut if you
          sign up&rdquo; or #ad. That&apos;s an FTC rule, and it&apos;s the one thing that gets a
          link revoked.
        </p>
      </div>
    </form>
  );
}
