"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

/**
 * Ban-safe reassurance interstitial.
 *
 * Placed right after the user tells us what they want (Job Preferences) — the
 * exact moment their guard is up ("is an auto-apply bot going to get me banned?").
 * Mirrors Sprout's motivation interstitials, but sells OUR differentiator:
 * account-safety + review-before-send, not volume. No input — one Continue.
 */
export default function StepReassurance({ onNext, onBack }: Props) {
  const points = [
    {
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      ),
      title: "Applies from your own browser",
      body: "Every application goes out from your computer, at a human pace — the way you would, just faster.",
    },
    {
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M5 13l4 4L19 7"
        />
      ),
      title: "You review before anything sends",
      body: "Nothing is submitted without your OK. You stay in control of every application.",
    },
    {
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      ),
      title: "Tailored, never spammed",
      body: "A fresh resume and cover letter matched to each role — not hundreds of identical blasts.",
    },
  ];

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 text-center"
    >
      <motion.div variants={item} className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-light text-accent text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          What makes HireDrop different
        </div>
        <h2 className="text-2xl font-bold text-text leading-tight">
          Automation that won&apos;t risk<br className="hidden sm:block" /> the account you&apos;ve built.
        </h2>
        <p className="text-sm text-text2 max-w-md mx-auto">
          Other tools blast hundreds of applications from their servers and get accounts flagged.
          HireDrop is built the safe way.
        </p>
      </motion.div>

      <motion.div variants={container} className="space-y-3 text-left">
        {points.map((p) => (
          <motion.div
            key={p.title}
            variants={item}
            className="flex items-start gap-4 p-4 rounded-xl bg-surface2 border border-border"
          >
            <div className="shrink-0 w-10 h-10 rounded-full bg-accent-light flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {p.icon}
              </svg>
            </div>
            <div>
              <p className="font-semibold text-text text-sm">{p.title}</p>
              <p className="text-sm text-text2 mt-0.5">{p.body}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={item} className="flex justify-between items-center pt-1">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="button" onClick={onNext}>Got it — continue</Button>
      </motion.div>
    </motion.div>
  );
}
