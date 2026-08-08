"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import HeroDeck from "./HeroDeck";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

// Ambient starfall for the section background — sparse, slow, behind everything.
const AMBIENT = [
  { l: 6, t: 30, d: 15, dl: 0, o: 0.5, s: 2 }, { l: 18, t: 62, d: 20, dl: -8, o: 0.3, s: 1.5 },
  { l: 30, t: 20, d: 13, dl: -4, o: 0.45, s: 2 }, { l: 42, t: 78, d: 18, dl: -10, o: 0.28, s: 1.5 },
  { l: 55, t: 40, d: 16, dl: -6, o: 0.4, s: 2 }, { l: 8, t: 84, d: 22, dl: -3, o: 0.25, s: 1.5 },
  { l: 24, t: 46, d: 14, dl: -12, o: 0.35, s: 1.5 }, { l: 48, t: 14, d: 19, dl: -7, o: 0.3, s: 2 },
];

export default function Hero() {
  return (
    <section
      id="hero"
      className="hero-space relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 78% at 50% -12%, #2a2158 0%, #130f2b 44%, #0a0a14 100%)",
      }}
    >
      <style>{`
        .hero-space{ --star:#fff; }
        .hero-well{position:absolute;left:50%;bottom:-30%;width:900px;max-width:120vw;aspect-ratio:1;
          transform:translateX(-50%);border-radius:9999px;pointer-events:none;
          background:radial-gradient(circle, rgba(108,92,231,.22), transparent 62%);filter:blur(20px)}
        .hero-glow{position:absolute;border-radius:9999px;filter:blur(60px);pointer-events:none}
        .hero-stars{position:absolute;inset:0;overflow:hidden;pointer-events:none}
        .hero-star{position:absolute;border-radius:9999px;background:var(--star);animation:heroStar linear infinite}
        @keyframes heroStar{0%{transform:translateY(-30px);opacity:0}10%{opacity:var(--o)}88%{opacity:var(--o)}100%{transform:translateY(90vh);opacity:0}}
        @media (prefers-reduced-motion: reduce){ .hero-star{animation:none} }
      `}</style>

      {/* deep-space atmosphere */}
      <div className="hero-well" aria-hidden />
      <div className="hero-glow" aria-hidden style={{ width: 420, height: 420, top: -120, right: -40, background: "rgba(108,92,231,.28)" }} />
      <div className="hero-glow" aria-hidden style={{ width: 300, height: 300, bottom: 40, left: -80, background: "rgba(0,184,148,.12)" }} />
      <div className="hero-stars" aria-hidden>
        {AMBIENT.map((st, i) => (
          <span key={i} className="hero-star" style={{
            left: `${st.l}%`, top: `${st.t}%`, width: st.s, height: st.s,
            animationDuration: `${st.d}s`, animationDelay: `${st.dl}s`,
            ["--o" as string]: st.o,
          }} />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">
          {/* Left — value proposition */}
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 text-sm font-medium rounded-full"
              style={{
                background: "rgba(108,92,231,.16)", color: "#cabfff",
                border: "1px solid rgba(167,139,250,.3)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.1)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00B894", boxShadow: "0 0 8px #00B894" }} />
              Human-in-the-loop AI · Your account stays yours
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.12] pb-1 mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#FFFFFF" }}
            >
              Apply to more jobs.
              <br />
              <span style={{ color: "#A78BFA" }}>Without risking your account.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg mb-8 max-w-lg" style={{ color: "rgba(228,226,244,.72)" }}>
              HireDrop finds roles, tailors your resume and cover letter for each one,
              and applies from your own browser — at a human pace, so your account stays
              safe. You review before anything sends.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start gap-4 mb-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto text-white font-semibold px-8 py-3.5 rounded-[12px] text-lg inline-block text-center"
                style={{
                  background: "linear-gradient(135deg, #7d6ff0, #6C5CE7)",
                  boxShadow: "0 10px 30px -6px rgba(124,108,255,.6), inset 0 1px 0 rgba(255,255,255,.25)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 14px 40px -6px rgba(124,108,255,.8), inset 0 1px 0 rgba(255,255,255,.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 30px -6px rgba(124,108,255,.6), inset 0 1px 0 rgba(255,255,255,.25)";
                }}
              >
                Start applying
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto font-medium px-8 py-3.5 rounded-[12px] text-lg inline-block text-center"
                style={{
                  color: "#EDEBFB", border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(255,255,255,.04)", backdropFilter: "blur(6px)",
                  transition: "transform 0.15s, border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "rgba(167,139,250,.6)";
                  e.currentTarget.style.background = "rgba(255,255,255,.07)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,.18)";
                  e.currentTarget.style.background = "rgba(255,255,255,.04)";
                }}
              >
                See How It Works
              </a>
            </motion.div>

            <motion.p variants={fadeUp} className="text-sm mb-10" style={{ color: "rgba(228,226,244,.6)" }}>
              <span className="font-semibold" style={{ color: "#A78BFA" }}>First 40 applications free.</span>{" "}
              No credit card — subscribe only after you&apos;ve seen it work.
            </motion.p>

            <motion.p variants={fadeUp} className="sm:hidden -mt-6 mb-8 text-[13px] flex items-start gap-2" style={{ color: "rgba(228,226,244,.6)" }}>
              <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#A78BFA" }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" />
              </svg>
              <span>
                Set up from your phone in 2 minutes — applications run in Chrome on your computer,
                and you approve them from anywhere.
              </span>
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {["From your own browser", "You review first", "Cancel anytime"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-sm" style={{ color: "rgba(228,226,244,.66)" }}>
                  <svg className="w-4 h-4 shrink-0" style={{ color: "#00B894" }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — the live glass deck (the product itself) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            <HeroDeck />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
