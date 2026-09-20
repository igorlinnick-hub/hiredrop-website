"use client";

// The application form. Six questions, because a human reads every one of them
// to decide whether to trust someone with a link — this is not a survey to be
// aggregated, and every extra field is a person who closes the tab.

import { useState } from "react";

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
      <div className="bg-white rounded-[10px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Got it — we&apos;ll read it ourselves</h2>
        <p className="text-gray-600 text-sm mt-3 max-w-md mx-auto">
          Every application is reviewed by a person, usually within a day or two. If it&apos;s a
          yes, we&apos;ll send you your link — <span className="font-medium text-gray-900">
          hiredrop.io/?ref={code || "yourname"}</span> — and it will show up under{" "}
          <span className="font-medium text-gray-900">Affiliate</span> in your HireDrop dashboard
          with your referrals and earnings next to it.
        </p>
        <p className="text-gray-500 text-xs mt-4">
          No account yet? Create one with the same email — your link attaches to it automatically.
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-[10px] border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
  const label = "block text-sm font-medium text-gray-900 mb-1.5";
  const hint = "text-xs text-gray-500 mt-1.5";

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-[10px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-8 space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={label} htmlFor="name">Your name</label>
          <input id="name" required maxLength={120} className={field} value={form.name}
                 onChange={(e) => set("name", e.target.value)} placeholder="Luca Moretti" />
        </div>
        <div>
          <label className={label} htmlFor="email">Email</label>
          <input id="email" required type="email" maxLength={254} className={field} value={form.email}
                 onChange={(e) => set("email", e.target.value)} placeholder="you@university.edu" />
          <p className={hint}>Use the email your HireDrop account has (or will have).</p>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="code">The link you want</label>
        <div className="flex items-center rounded-[10px] border border-gray-200 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <span className="pl-4 text-sm text-gray-400 select-none">hiredrop.io/?ref=</span>
          <input id="code" required maxLength={39}
                 className="flex-1 bg-transparent px-2 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                 value={form.desired_code}
                 onChange={(e) => set("desired_code", e.target.value)} placeholder="luca" />
        </div>
        {codeBad ? (
          <p className="text-xs text-red-600 mt-1.5">
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
        <p className="rounded-[10px] bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div>
        <button type="submit" disabled={sending || codeBad}
                className="w-full sm:w-auto bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold px-8 py-3.5 rounded-[10px] transition shadow-lg shadow-accent/25">
          {sending ? "Sending…" : "Apply for a link"}
        </button>
        <p className="text-gray-500 text-xs mt-4">
          When you share your link you must say you earn a commission — &ldquo;I get a cut if you
          sign up&rdquo; or #ad. That&apos;s an FTC rule, and it&apos;s the one thing that gets a
          link revoked.
        </p>
      </div>
    </form>
  );
}
