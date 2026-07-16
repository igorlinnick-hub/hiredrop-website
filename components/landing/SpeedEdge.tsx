"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// A stream of realistic-but-generic roles. No real company names / logos — we
// don't imply partnerships we don't have.
const FRESH = [
  { role: "Senior Product Designer", meta: "Remote · Full-time" },
  { role: "Marketing Manager", meta: "Hybrid · Full-time" },
  { role: "Data Analyst", meta: "Remote · Contract" },
  { role: "Customer Success Lead", meta: "On-site · Full-time" },
  { role: "Growth Marketer", meta: "Remote · Full-time" },
  { role: "Operations Associate", meta: "Hybrid · Full-time" },
];
const STAMPS = ["just now", "2m ago", "5m ago", "9m ago"];

function useOnView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView] as const;
}

function CountUp({ target, active }: { target: number; active: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const steps = 48;
    const id = setInterval(() => {
      frame++;
      const p = 1 - Math.pow(1 - frame / steps, 3);
      setN(Math.round(target * p));
      if (frame >= steps) {
        setN(target);
        clearInterval(id);
      }
    }, 24);
    return () => clearInterval(id);
  }, [active, target]);
  return <>{(active ? n : 0).toLocaleString()}</>;
}

// Live feed of fresh roles dropping in at the top. Only ticks while on-screen.
function LiveFeed({ active }: { active: boolean }) {
  const [start, setStart] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setStart((s) => (s + 1) % FRESH.length), 2600);
    return () => clearInterval(id);
  }, [active]);

  const rows = [0, 1, 2, 3].map((i) => FRESH[(start + i) % FRESH.length]);

  return (
    <div className="rounded-2xl bg-white border border-[#E8E8F0] p-5 shadow-[0_20px_60px_rgba(20,18,31,0.10)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1A2E]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]" />
          </span>
          New matches
        </div>
        <span className="text-xs text-[#9a97ad]">live</span>
      </div>

      <div className="space-y-2.5">
        {rows.map((job, i) => (
            <motion.div
              key={job.role}
              layout
              initial={i === 0 ? { opacity: 0, y: -14, scale: 0.98 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                i === 0
                  ? "border-[#6C5CE7]/25 bg-[#6C5CE7]/[0.05]"
                  : "border-[#EEecF4] bg-[#FaFaFc]"
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[#EEE9FF] flex items-center justify-center text-[#6C5CE7] shrink-0">
                <svg className="w-4.5 h-4.5" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#1A1A2E] truncate">{job.role}</div>
                <div className="text-xs text-[#8b88a0]">{job.meta} · {STAMPS[i]}</div>
              </div>
              {i === 0 ? (
                <span className="shrink-0 text-[11px] font-semibold text-[#6C5CE7] bg-white border border-[#6C5CE7]/20 rounded-full px-2.5 py-1">
                  Applied · 1st wave
                </span>
              ) : (
                <span className="shrink-0 text-[11px] font-medium text-[#9a97ad] bg-white border border-[#EEecF4] rounded-full px-2.5 py-1">
                  matched
                </span>
              )}
            </motion.div>
        ))}
      </div>
    </div>
  );
}

const easeOut = [0.22, 1, 0.36, 1] as const;

export default function SpeedEdge() {
  const [ref, inView] = useOnView<HTMLDivElement>();

  return (
    <section id="speed" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#F7F7FB] overflow-hidden">
      {/* soft brand glow, kept subtle */}
      <div className="glow-purple pointer-events-none" style={{ width: 520, height: 520, top: "-10%", right: "-6%", opacity: 0.28 }} />

      <div ref={ref} className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        {/* Left — the pitch */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4 px-3.5 py-1.5 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] text-xs font-semibold border border-[#6C5CE7]/20"
          >
            Speed is the edge
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] leading-[1.15] pb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            New roles open all day.<br className="hidden sm:block" /> Be first in line.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.08, ease: easeOut }}
            className="mt-4 text-lg text-[#6B6B8A] max-w-xl"
          >
            By the time a job hits the big boards, hundreds have already applied. HireDrop
            watches Indeed, ZipRecruiter and thousands of company ATS for your match — and
            applies the moment one opens, while you'd still be scrolling.
          </motion.p>

          {/* honest stat trio: one market fact + two directional truths */}
          <div className="mt-9 grid grid-cols-3 gap-4 max-w-lg">
            {[
              {
                big: <><CountUp target={50000} active={inView} />+</>,
                label: "new U.S. roles posted every day",
              },
              { big: "1st", label: "wave — early, not applicant #250" },
              { big: "More", label: "callbacks go to early applicants" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.12 + i * 0.1, ease: easeOut }}
              >
                <div className="text-2xl sm:text-[28px] font-bold text-[#6C5CE7]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {s.big}
                </div>
                <div className="text-xs text-[#6B6B8A] mt-1.5 leading-snug">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right — live feed */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          <LiveFeed active={inView} />
          <p className="mt-3 text-center text-xs text-[#9a97ad]">
            Watching for your match across every connected platform.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
