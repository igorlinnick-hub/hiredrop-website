"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/*
  Lightweight floating AI guide — uses a simple CSS gradient orb
  instead of the heavy AIOrb component to avoid performance issues.
*/

const SECTIONS = [
  { id: "hero", message: "Hi! I'm your AI job assistant. Let me show you around." },
  { id: "how-it-works", message: "This is how I help — from resume to auto-apply." },
  { id: "features", message: "AI cover letters, multi-platform search — all built in." },
  { id: "chrome-demo", message: "Watch the Chrome extension fill forms automatically!" },
  { id: "stats", message: "Thousands of job seekers saving hours every day." },
  { id: "pricing", message: "Weekly or monthly. Cancel anytime." },
  { id: "faq", message: "Got questions? I've got answers." },
];

/* Tiny performant orb — pure CSS, no blur/blend */
function MiniOrb() {
  return (
    <div className="relative w-full h-full">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, #6C5CE7, #a78bfa, #c4b5fd, #ffffff, #a78bfa, #6C5CE7)",
          animation: "orbSpin 4s linear infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: "15%",
          background: "radial-gradient(circle at 40% 35%, #ffffff 0%, #c4b5fd 50%, #6C5CE7 100%)",
          animation: "orbShift 6s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: "30%",
          background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(167,139,250,0.5) 100%)",
          animation: "orbShift 4s ease-in-out infinite alternate-reverse",
        }}
      />
    </div>
  );
}

export default function FloatingAIGuide() {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showBubble, setShowBubble] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevIndex = useRef(-1);

  useEffect(() => {
    const handleScroll = () => {
      if (dismissed) return;

      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      // Don't show until scrolled past hero
      if (scrollY < vh * 0.5) {
        if (activeIndex !== -1) setActiveIndex(-1);
        return;
      }

      // Find which section is most visible
      let best = -1;
      let bestScore = 0;

      for (let i = 0; i < SECTIONS.length; i++) {
        const el = document.getElementById(SECTIONS[i].id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const visible = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
        if (visible > bestScore) {
          bestScore = visible;
          best = i;
        }
      }

      if (best !== -1 && best !== prevIndex.current) {
        prevIndex.current = best;
        setActiveIndex(best);
        setShowBubble(false);
        clearTimeout(bubbleTimer.current);
        bubbleTimer.current = setTimeout(() => setShowBubble(true), 800);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(bubbleTimer.current);
    };
  }, [dismissed, activeIndex]);

  // Auto-hide bubble
  useEffect(() => {
    if (!showBubble) return;
    const t = setTimeout(() => setShowBubble(false), 4500);
    return () => clearTimeout(t);
  }, [showBubble, activeIndex]);

  if (dismissed || activeIndex === -1) return null;

  const section = SECTIONS[activeIndex];

  return (
    <div className="fixed bottom-6 right-6 z-50" style={{ pointerEvents: "none" }}>
      {/* Chat bubble */}
      <AnimatePresence mode="wait">
        {showBubble && (
          <motion.div
            key={activeIndex}
            className="mb-3"
            style={{ maxWidth: 220, pointerEvents: "auto" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="bg-white rounded-2xl px-4 py-3 text-[12px] text-[#1A1A2E] leading-relaxed relative"
              style={{
                boxShadow: "0 4px 20px rgba(108,92,231,0.12), 0 1px 4px rgba(0,0,0,0.05)",
                border: "1px solid rgba(108,92,231,0.08)",
              }}
            >
              {section.message}
              <div
                className="absolute -bottom-1 right-5 w-2.5 h-2.5 bg-white rotate-45"
                style={{ borderRight: "1px solid rgba(108,92,231,0.08)", borderBottom: "1px solid rgba(108,92,231,0.08)" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orb */}
      <motion.div
        className="relative cursor-pointer"
        style={{ width: 52, height: 52, pointerEvents: "auto" }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onClick={() => setShowBubble((s) => !s)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
      >
        <MiniOrb />
        {/* Close */}
        <button
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-[#E8E8F0] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
        >
          <svg className="w-2 h-2 text-[#6B6B8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    </div>
  );
}
