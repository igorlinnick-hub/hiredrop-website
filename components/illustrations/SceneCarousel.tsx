"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scene, type SceneName } from "./Scene";

interface Slide {
  name: SceneName;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    name: "search",
    title: "Find the right roles",
    body: "HireDrop surfaces jobs matched to your profile across Indeed and company career sites.",
  },
  {
    name: "tailored",
    title: "Tailored, never spammed",
    body: "A fresh resume and cover letter written for each role — in your voice, not a blast.",
  },
  {
    name: "apply",
    title: "Applies for you",
    body: "It fills out and submits each application from your own browser, at a human pace.",
  },
  {
    name: "safe",
    title: "Your account stays safe",
    body: "No captcha-cracking, no server bots. The safe way to apply — so you never get flagged.",
  },
  {
    name: "welcome",
    title: "You stay in control",
    body: "Review before anything sends. You approve, HireDrop does the busywork.",
  },
];

const INTERVAL = 4800;

export default function SceneCarousel() {
  const [i, setI] = useState(0);
  const go = useCallback((n: number) => setI((n + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % SLIDES.length), INTERVAL);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[i];

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center px-10 py-14"
      style={{ background: "linear-gradient(160deg, #EEE9FF 0%, #F7F7FB 55%, #ffffff 100%)" }}
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.name}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div
              className="rounded-3xl bg-white p-4 mb-8"
              style={{ boxShadow: "0 20px 50px rgba(108,92,231,0.14)" }}
            >
              <Scene name={slide.name} size={248} priority={i === 0} />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2" style={{ letterSpacing: "-0.02em" }}>
              {slide.title}
            </h2>
            <p className="text-[15px] text-[#6B6B8A] leading-relaxed max-w-xs">{slide.body}</p>
          </motion.div>
        </AnimatePresence>

        {/* dots */}
        <div className="flex items-center gap-2 mt-10">
          {SLIDES.map((s, idx) => (
            <button
              key={s.name}
              onClick={() => go(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className="h-2 rounded-full transition-all"
              style={{
                width: idx === i ? 22 : 8,
                background: idx === i ? "#6C5CE7" : "#D9D2F5",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
