"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import DecorMarks from "./DecorMarks";
import HeroCampaignDemo from "./HeroCampaignDemo";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative pt-28 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(rgba(108,92,231,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(108,92,231,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      {/* soft depth + signature marks */}
      <div className="glow-purple" style={{ width: 520, height: 520, top: -160, right: -60 }} />
      <div className="glow-purple" style={{ width: 340, height: 340, bottom: -140, left: -80 }} />
      <DecorMarks />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — text with staggered load animation */}
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.div
              variants={fadeUp}
              className="inline-block mb-6 px-4 py-1.5 bg-[#EEE9FF] text-[#6C5CE7] text-sm font-medium rounded-full"
            >
              Human-in-the-loop AI · Your account stays yours
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-[52px] font-bold text-[#1A1A2E] leading-[1.15] pb-1 mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Apply to more jobs.
              <br />
              <span className="text-[#6C5CE7]">Without risking your account.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-[#6B6B8A] mb-8 max-w-lg">
              HireDrop finds roles, tailors your resume and cover letter for each one,
              and applies from your own browser — at a human pace, so your account stays
              safe. You review before anything sends.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start gap-4 mb-10">
              <Link
                href="/signup"
                className="w-full sm:w-auto bg-[#6C5CE7] text-white font-semibold px-8 py-3.5 rounded-[10px] text-lg shadow-lg inline-block text-center"
                style={{
                  boxShadow: "0 8px 24px rgba(108,92,231,0.25)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(108,92,231,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(108,92,231,0.25)";
                }}
              >
                Start applying
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto border border-[#E8E8F0] text-[#1A1A2E] font-medium px-8 py-3.5 rounded-[10px] text-lg inline-block text-center"
                style={{ transition: "transform 0.15s, border-color 0.15s" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "#6C5CE7";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#E8E8F0";
                }}
              >
                See How It Works
              </a>
            </motion.div>

            {/* Mobile visitors: set the desktop expectation BEFORE signup, not after.
                Phone = setup + approvals; the applying itself runs in desktop Chrome. */}
            <motion.p variants={fadeUp} className="sm:hidden -mt-6 mb-8 text-[13px] text-[#6B6B8A] flex items-start gap-2">
              <span aria-hidden>📱</span>
              <span>
                Set up from your phone in 2 minutes — applications run in Chrome on your computer,
                and you approve them from anywhere.
              </span>
            </motion.p>

            {/* Trust row — honest, ban-safe (no fabricated counts) */}
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {["From your own browser", "You review first", "Cancel anytime"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-sm text-[#6B6B8A]">
                  <svg className="w-4 h-4 text-[#00B894] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — AI Orb with chat bubbles */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="hidden lg:flex items-center justify-center"
          >
            <HeroCampaignDemo />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
