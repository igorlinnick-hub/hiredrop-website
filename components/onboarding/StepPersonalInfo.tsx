"use client";

import { useEffect, useState } from "react";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { apiGet, apiPost } from "@/lib/api";
import { answersUi, type AnswerQuestion } from "@/lib/employerAnswers";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";
import { mayContinue, residencyQuestion } from "@/lib/usResident";

// The question is drawn only once the server has handed it over; a server that never
// answers leaves the step passable (lib/usResident.ts), never stuck on a spinner.
const LOAD_TIMEOUT_MS = 8000;

interface Props {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  onNext: () => void;
}

export default function StepPersonalInfo({ profile, updateProfile, onNext }: Props) {
  // US only (Igor, 10-07): asked first, so nobody abroad sets up an account to be told
  // "no" at the end. The answer is saved through the server like the rest of the
  // employer answers — the answers step shows it again, already ticked.
  const [usQuestion, setUsQuestion] = useState<AnswerQuestion | null>(null);
  const [inUs, setInUs] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data } = await createClient().auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const res = await Promise.race([
          apiGet<{ questions: AnswerQuestion[] }>("/profile/employer-answers", token),
          new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error("timeout")), LOAD_TIMEOUT_MS)),
        ]);
        const q = residencyQuestion(res.questions);
        if (!live || !q) return;
        setUsQuestion(q);
        if (typeof q.value === "boolean") setInUs(q.value);
      } catch {
        /* no question — the answers step and the Start gate still ask it */
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Only a Yes is saved, on Continue: a No saved on click could land after the Yes that
  // followed it and close Start for someone who does live here.
  async function saveYes(key: string) {
    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;
      if (token) await apiPost(answersUi("/profile/employer-answers"), token, { [key]: true });
    } catch {
      /* not fatal: the answers step saves it again, and the Start gate checks it */
    }
  }

  const canGo = !loading && mayContinue(usQuestion, inUs);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canGo || saving) return;
    if (usQuestion && inUs === true) {
      setSaving(true);
      await saveYes(usQuestion.key);
      setSaving(false);
    }
    onNext();
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">Personal Information</h2>
        <p className="text-sm text-text2 mt-1">This info will be used when applying to jobs.</p>
      </div>

      {usQuestion && (
        <div data-testid="answer-us-first">
          <span className="mb-1.5 block text-sm font-medium text-text">{usQuestion.label}</span>
          <div className="flex gap-2">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setInUs(v)}
                aria-pressed={inUs === v}
                className={
                  "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition active:scale-[.98] " +
                  (inUs === v
                    ? "border-accent bg-accent-light text-accent"
                    : "border-border bg-surface text-text2 hover:border-accent hover:text-text")
                }
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
          {inUs === false && (
            <div className="mt-3 rounded-lg border border-yellow/30 bg-yellow/10 px-4 py-3" data-testid="us-only">
              <p className="text-sm font-semibold text-text">Sorry — HireDrop works only in the United States for now.</p>
              <p className="mt-1 text-sm text-text2">
                We apply to US jobs, and US employers hire people who live there. If you&apos;re in the US,
                choose Yes to continue.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="First name"
          name="name"
          value={profile.name}
          onChange={(e) => updateProfile({ name: e.target.value })}
          placeholder="John"
          required
        />
        <Input
          label="Last name"
          name="last_name"
          value={profile.last_name}
          onChange={(e) => updateProfile({ last_name: e.target.value })}
          placeholder="Doe"
          required
        />
      </div>

      <Input
        label="Email"
        name="email"
        type="email"
        value={profile.email}
        onChange={(e) => updateProfile({ email: e.target.value })}
        placeholder="you@example.com"
        hint="This email will be inserted into job application forms."
        required
      />

      <Input
        label="Phone"
        name="phone"
        type="tel"
        value={profile.phone}
        onChange={(e) => updateProfile({ phone: e.target.value })}
        placeholder="+1 (555) 000-0000"
        hint="Required for Indeed applications."
        required
      />

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={!canGo || saving} data-testid="btn-profile-continue">
          {loading ? "Loading…" : saving ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
