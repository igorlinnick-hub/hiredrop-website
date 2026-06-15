"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://web-production-db45.up.railway.app";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // The backend generates the Supabase recovery link with the service key
    // and delivers it over Gmail SMTP — Supabase's built-in email is too
    // rate-limited to rely on. The link routes through /auth/callback so the
    // one-time code is exchanged for a session before /auth/update-password.
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      setSent(true);
    } catch {
      setError("Couldn't send the reset link. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-text">
            <span className="text-accent">Hire</span>Drop
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-text">Reset your password</h1>
          <p className="mt-2 text-sm text-text2">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-green/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-text">Check your email for a reset link.</p>
              <Link href="/login" className="text-accent hover:text-accent2 text-sm font-medium">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red/10 text-red text-sm">{error}</div>
              )}
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-text2">
          Remember your password?{" "}
          <Link href="/login" className="text-accent hover:text-accent2 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
