"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import DecorMarks from "./DecorMarks";
import Starfield from "./Starfield";

const STATS = [
  { value: 75, suffix: "%", label: "of resumes are filtered out by ATS before a human ever sees them" },
  { value: 250, suffix: "+", label: "applicants for the average corporate job opening" },
  { value: 100, suffix: "+", label: "applications it takes to land a single offer" },
  { value: 23, suffix: " min", label: "spent filling out just one application form" },
];

function CountUp({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const steps = 55;
    const id = setInterval(() => {
      frame++;
      const p = 1 - Math.pow(1 - frame / steps, 3);
      setN(Math.round(target * p));
      if (frame >= steps) {
        setN(target);
        clearInterval(id);
      }
    }, 26);
    return () => clearInterval(id);
  }, [active, target]);
  return (
    <span className="text-4xl sm:text-5xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#a78bfa" }}>
      {active ? n : 0}
      {suffix}
    </span>
  );
}

const easeOut = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};

export default function ProblemStats() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);

  // Scroll-driven day → night. A light "day" wash covers the section as it
  // enters (blending with the light Ticker above) and *melts* away as you
  // scroll in, revealing the night. The heading re-colours in sync so it stays
  // readable through the whole transition — same technique as HowItWorks.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });
  const dayOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  const starOpacity = useTransform(scrollYProgress, [0.5, 0.95], [0, 1]);
  const titleColor = useTransform(scrollYProgress, [0.42, 0.66], ["#1A1A2E", "#ffffff"]);
  const subColor = useTransform(scrollYProgress, [0.42, 0.66], ["#6B6B8A", "#9ca3af"]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setActive(true), { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative py-44 px-4 sm:px-6 lg:px-8" style={{ background: "#14121f" }}>
      {/* Night sky base — stars fade in as the day wash melts away. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div className="absolute inset-0" style={{ opacity: starOpacity }}>
          <Starfield />
        </motion.div>
        <div className="glow-purple" style={{ width: 620, height: 620, top: "-15%", left: "-8%", opacity: 0.5 }} />
        <DecorMarks />
      </div>

      {/* Day wash — the перелив. Sits on top at rest, melts out with scroll. */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: dayOpacity,
          background: "linear-gradient(180deg, #F7F7FB 0%, #F4F3F9 55%, #ECEAF4 100%)",
        }}
      />
      {/* Keep the very top edge blended with the light section above at all times. */}
      <div
        className="absolute top-0 inset-x-0 h-40 pointer-events-none"
        style={{ background: "linear-gradient(180deg, #F7F7FB 0%, rgba(247,247,251,0) 100%)" }}
      />
      {/* Fade back to daylight at the bottom, into the next section. */}
      <div
        className="absolute bottom-0 inset-x-0 h-64 pointer-events-none"
        style={{ background: "linear-gradient(0deg, #F7F7FB 0%, rgba(247,247,251,0.55) 32%, rgba(38,34,56,0.12) 72%, rgba(20,18,31,0) 100%)" }}
      />

      <motion.div
        className="relative z-10 max-w-5xl mx-auto"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        transition={{ staggerChildren: 0.12 }}
      >
        <motion.div variants={fadeUp} className="text-center mb-16">
          <span className="inline-block mb-4 px-3.5 py-1.5 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] text-xs font-semibold border border-[#6C5CE7]/20">
            The problem
          </span>
          <motion.h2
            className="text-3xl sm:text-4xl font-bold leading-[1.35] pb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: titleColor }}
          >
            Job hunting is a numbers game
            <br className="hidden sm:block" /> rigged against you
          </motion.h2>
          <motion.p className="mt-4 max-w-xl mx-auto" style={{ color: subColor }}>
            You send applications into a void — most never reach a human, and the few that do took hours to send.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 text-center backdrop-blur-sm"
            >
              <CountUp target={s.value} suffix={s.suffix} active={active} />
              <p className="text-sm text-gray-400 mt-3 leading-relaxed">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div variants={fadeUp} className="mt-14 max-w-2xl mx-auto text-center">
          <p className="text-lg text-white font-medium">HireDrop is built to beat this.</p>
          <p className="mt-2 text-gray-400">
            Tailored, ATS-ready applications sent from your own browser — so every application you send
            actually reaches a human, without burning your evenings or risking your account.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
