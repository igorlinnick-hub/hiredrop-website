"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import AIOrb from "./AIOrb";

const AI_PROMPTS = [
  { question: "What salary should I expect?", answer: "Based on your skills, $95K–$140K for remote roles." },
  { question: "Best keywords for my resume?", answer: "Growth marketing, data-driven, pipeline generation." },
  { question: "Will this get my account banned?", answer: "No — it applies from your browser, at a human pace." },
  { question: "Will cover letters sound like me?", answer: "Yes — AI matches your writing style perfectly." },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function HeroOrb() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [phase, setPhase] = useState<"question" | "answer" | "pause">("pause");

  useEffect(() => {
    // Cycle: pause → question → answer → pause → next
    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)); };

    t(() => setPhase("question"), 1200);
    t(() => setPhase("answer"), 3000);
    t(() => setPhase("pause"), 6000);
    t(() => {
      setPromptIndex((i) => (i + 1) % AI_PROMPTS.length);
      setPhase("question");
    }, 7000);
    t(() => setPhase("answer"), 8800);
    t(() => setPhase("pause"), 11800);
    t(() => {
      setPromptIndex((i) => (i + 1) % AI_PROMPTS.length);
      setPhase("question");
    }, 12800);
    t(() => setPhase("answer"), 14600);
    t(() => setPhase("pause"), 17600);
    // Restart cycle
    t(() => {
      setPromptIndex(0);
      setPhase("pause");
    }, 18600);

    return () => timers.forEach(clearTimeout);
  }, []);

  // Restart loop
  useEffect(() => {
    if (phase !== "pause" || promptIndex !== 0) return;
    const timer = setTimeout(() => setPhase("question"), 1200);
    return () => clearTimeout(timer);
  }, [phase, promptIndex]);

  const prompt = AI_PROMPTS[promptIndex];

  return (
    <div className="relative w-[340px] h-[340px] flex items-center justify-center">
      {/* Orb center */}
      <AIOrb size={160} />

      {/* Question bubble — top right */}
      <AnimatePresence mode="wait">
        {(phase === "question" || phase === "answer") && (
          <motion.div
            key={`q-${promptIndex}`}
            className="absolute top-2 -right-4"
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="bg-[#F7F7FB] rounded-2xl rounded-br-sm px-3.5 py-2 text-[11px] text-[#1A1A2E] max-w-[180px]"
              style={{ boxShadow: "0 2px 12px rgba(108,92,231,0.08)" }}
            >
              {prompt.question}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer bubble — bottom left */}
      <AnimatePresence mode="wait">
        {phase === "answer" && (
          <motion.div
            key={`a-${promptIndex}`}
            className="absolute bottom-4 -left-6"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2 text-[11px] text-[#1A1A2E] max-w-[190px] border border-[#EEE9FF]"
              style={{ boxShadow: "0 4px 16px rgba(108,92,231,0.12)" }}
            >
              <span className="text-[#6C5CE7] font-medium">AI: </span>
              {prompt.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing indicator */}
      <AnimatePresence>
        {phase === "question" && (
          <motion.div
            className="absolute bottom-6 -left-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="bg-white rounded-full px-3 py-1.5 flex items-center gap-1 border border-[#EEE9FF]"
              style={{ boxShadow: "0 2px 8px rgba(108,92,231,0.08)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#6C5CE7] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#c4b5fd] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
      <div className="max-w-7xl mx-auto">
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
              className="text-4xl sm:text-5xl lg:text-[52px] font-bold text-[#1A1A2E] leading-[1.1] mb-6"
              style={{ fontFamily: "'Syne', sans-serif" }}
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
                Get Started Free
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

            {/* Social proof */}
            <motion.div variants={fadeUp} className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[
                  "bg-[#6C5CE7]",
                  "bg-emerald-500",
                  "bg-amber-500",
                  "bg-rose-500",
                  "bg-blue-500",
                ].map((bg, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-full ${bg} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}
                  >
                    {["A", "M", "K", "J", "S"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#6B6B8A]">
                Join <strong className="text-[#1A1A2E]">2,400+</strong> job seekers
                automating their search
              </p>
            </motion.div>
          </motion.div>

          {/* Right — AI Orb with chat bubbles */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="hidden lg:flex items-center justify-center"
          >
            <HeroOrb />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
