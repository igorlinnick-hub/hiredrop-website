"use client";

import { useEffect, useRef, useState } from "react";
import { easeInOut, motion, useScroll, useSpring, useTransform } from "framer-motion";
import Starfield from "./Starfield";

const STEPS = [
  {
    number: "01",
    title: "Upload your resume",
    description: "Drag & drop your PDF resume. HireDrop reads it to understand your experience, skills, and writing style.",
    badge: "Profile",
    badgeColor: "from-[#26262F] to-[#101014]",
  },
  {
    number: "02",
    title: "Set your preferences",
    description: "Choose keywords, locations, job types, and platforms. We'll only apply to jobs that match your criteria.",
    badge: "Filters",
    badgeColor: "from-[#26262F] to-[#101014]",
  },
  {
    number: "03",
    title: "A cover letter for every job",
    description: "Our algorithm writes a personalized cover letter for each job — matching your tone, not a generic template.",
    badge: "Writing",
    badgeColor: "from-[#26262F] to-[#101014]",
  },
  {
    number: "04",
    title: "You review, then it applies",
    description: "The Chrome extension fills out and submits each application from your own browser — you approve first, so your account stays safe.",
    badge: "Ban-safe",
    badgeColor: "from-[#26262F] to-[#101014]",
  },
];

function StepBadge({ label, gradient }: { label: string; gradient: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${gradient} text-white text-[10px] font-semibold uppercase tracking-wider mb-4`}>
      <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
      {label}
    </div>
  );
}

function Panel1() {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 p-6 sm:p-10 max-w-[440px] w-full" style={{ boxShadow: "0 12px 40px rgba(58,44,18,0.1)" }}>
      <StepBadge label="Profile" gradient="from-[#26262F] to-[#101014]" />
      <p className="text-base font-semibold text-[#101014] mb-5">Upload Resume</p>
      <div className="border-2 border-dashed border-[#101014]/30 rounded-xl p-10 text-center bg-[#F8F4EC]/50">
        <div className="w-14 h-14 bg-[#EFE8D8] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#101014]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-sm text-[#5C574F]">Drag & drop your PDF here</p>
        <p className="text-xs text-[#5C574F]/60 mt-1">or click to browse</p>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-[#00B894]">
        <span className="w-5 h-5 rounded-full bg-[#00B894] flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </span>
        resume_2026.pdf uploaded
      </div>
    </div>
  );
}

function Panel2() {
  const chips = ["Marketing Manager", "Growth Lead", "Content Strategy", "Remote", "USA", "Full-time"];
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 p-6 sm:p-10 max-w-[440px] w-full" style={{ boxShadow: "0 12px 40px rgba(58,44,18,0.1)" }}>
      <StepBadge label="Filters" gradient="from-[#26262F] to-[#101014]" />
      <p className="text-base font-semibold text-[#101014] mb-5">Job Preferences</p>
      <div className="space-y-5">
        <div>
          <label className="text-xs text-[#5C574F] mb-2 block font-medium">Keywords</label>
          <div className="flex flex-wrap gap-2">
            {chips.slice(0, 3).map((c) => (
              <span key={c} className="px-3 py-1.5 bg-[#EFE8D8] text-[#101014] text-xs rounded-full font-medium">{c}</span>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-[#5C574F] mb-2 block font-medium">Location & Type</label>
          <div className="flex flex-wrap gap-2">
            {chips.slice(3).map((c) => (
              <span key={c} className="px-3 py-1.5 bg-[#F6F1E7] text-[#101014] text-xs rounded-full border border-[#E7E0D2]">{c}</span>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-[#5C574F] mb-2 block font-medium">Platforms</label>
          <div className="flex gap-4">
            {["Indeed", "ZipRecruiter", "Company ATS"].map((p) => (
              <span key={p} className="flex items-center gap-1.5 text-xs text-[#101014]">
                <span className="w-3.5 h-3.5 rounded bg-[#101014]" />
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel3() {
  const text = "Dear Hiring Manager,\n\nI'm excited to apply for the Marketing Manager role. With 5+ years driving data-driven campaigns that grew pipeline by 340%...";
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 p-6 sm:p-10 max-w-[440px] w-full" style={{ boxShadow: "0 12px 40px rgba(58,44,18,0.1)" }}>
      <StepBadge label="Writing" gradient="from-[#26262F] to-[#101014]" />
      <div className="flex items-center justify-between mb-5">
        <p className="text-base font-semibold text-[#101014]">Cover Letter</p>
        <span className="flex items-center gap-1.5 text-[10px] text-[#6C5CE7]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6C5CE7] animate-pulse" />
          Writing...
        </span>
      </div>
      <div className="bg-[#F8F4EC]/50 rounded-xl p-5 min-h-[140px]">
        <p className="text-sm text-[#101014] leading-relaxed whitespace-pre-wrap">
          {text}
          <span className="inline-block w-[2px] h-3.5 bg-[#6C5CE7] ml-0.5 animate-pulse align-middle" />
        </p>
      </div>
      <div className="mt-4 flex items-center gap-5">
        <div className="flex-1">
          <div className="flex justify-between text-[11px] mb-1.5"><span className="text-[#5C574F]">Tone match</span><span className="text-[#00B894] font-medium">96%</span></div>
          <div className="h-1.5 bg-[#E7E0D2] rounded-full"><div className="h-full w-[96%] bg-[#00B894] rounded-full" /></div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-[11px] mb-1.5"><span className="text-[#5C574F]">Relevance</span><span className="text-[#6C5CE7] font-medium">92%</span></div>
          <div className="h-1.5 bg-[#E7E0D2] rounded-full"><div className="h-full w-[92%] bg-[#6C5CE7] rounded-full" /></div>
        </div>
      </div>
    </div>
  );
}

function Panel4() {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 p-6 sm:p-10 max-w-[440px] w-full" style={{ boxShadow: "0 12px 40px rgba(58,44,18,0.1)" }}>
      <StepBadge label="Autopilot" gradient="from-[#26262F] to-[#101014]" />
      <div className="flex items-center justify-between mb-5">
        <p className="text-base font-semibold text-[#101014]">Today&apos;s Results</p>
        <span className="flex items-center gap-1.5 text-[10px] text-[#00B894]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00B894] animate-pulse" />
          Campaign running
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#EFE8D8] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#101014]">47</p>
          <p className="text-[10px] text-[#5C574F] mt-0.5">Applied</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">12</p>
          <p className="text-[10px] text-[#5C574F] mt-0.5">Interviews</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">156</p>
          <p className="text-[10px] text-[#5C574F] mt-0.5">Found</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { title: "Marketing Manager", company: "Stripe", status: "Interview", color: "bg-emerald-100 text-emerald-700" },
          { title: "Growth Lead", company: "Notion", status: "Applied", color: "bg-amber-100 text-amber-700" },
          { title: "Content Strategist", company: "Vercel", status: "Applied", color: "bg-amber-100 text-amber-700" },
        ].map((j) => (
          <div key={j.title} className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-[#F6F1E7]">
            <div><p className="text-sm font-medium text-[#101014]">{j.title}</p><p className="text-[11px] text-[#5C574F]">{j.company}</p></div>
            <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${j.color}`}>{j.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = panelRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1) setActiveStep(index);
          }
        });
      },
      { threshold: 0.5 }
    );

    panelRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const panels = [<Panel1 key={0} />, <Panel2 key={1} />, <Panel3 key={2} />, <Panel4 key={3} />];

  // Continuous day → night driven by scroll through the whole 400vh section (not
  // the discrete step index) — so the sky *melts* smoothly instead of switching.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  // Mouse wheels scroll in discrete jumps — feed the raw progress through a spring
  // so the day→night wash glides between scroll positions instead of stepping.
  const progress = useSpring(scrollYProgress, { stiffness: 85, damping: 26, mass: 0.6, restDelta: 0.0005 });
  const nightOpacity = useTransform(progress, [0.18, 0.9], [0, 1], { ease: easeInOut });
  const starOpacity = useTransform(progress, [0.4, 0.8], [0, 1], { ease: easeInOut });
  const titleColor = useTransform(progress, [0.44, 0.7], ["#101014", "#ffffff"], { ease: easeInOut });
  const descColor = useTransform(progress, [0.44, 0.7], ["#5C574F", "#D6D0C4"], { ease: easeInOut });
  const numColor = useTransform(progress, [0.44, 0.7], ["rgba(58,44,18,0.12)", "rgba(255,255,255,0.14)"], { ease: easeInOut });

  return (
    <section id="how-it-works" ref={sectionRef} className="relative lg:h-[400vh]">
      {/* Desktop: 400vh sticky-scroll day→night. Hidden on mobile (uses the stacked fallback below). */}
      <div className="sticky top-0 h-screen overflow-hidden hidden lg:block" style={{ background: "linear-gradient(160deg, #FAF7F0 0%, #F8F4EC 50%, #FAF7F0 100%)" }}>
        {/* smooth night wash — opacity melts in continuously with scroll */}
        <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: nightOpacity, background: "linear-gradient(160deg, #1c1930 0%, #14121f 50%, #17142a 100%)" }} />
        <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: starOpacity }}>
          <Starfield />
        </motion.div>
        {/* Soft cloud shapes — visible but subtle */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 700, height: 350,
            background: "radial-gradient(ellipse, rgba(58,44,18,0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
            borderRadius: "50%",
            top: "5%", left: "-5%",
            animation: "cloudFloat1 30s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: 600, height: 300,
            background: "radial-gradient(ellipse, rgba(167,139,250,0.07) 0%, transparent 70%)",
            filter: "blur(35px)",
            borderRadius: "50%",
            bottom: "5%", right: "-3%",
            animation: "cloudFloat2 35s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: 500, height: 250,
            background: "radial-gradient(ellipse, rgba(196,181,253,0.06) 0%, transparent 70%)",
            filter: "blur(30px)",
            borderRadius: "50%",
            top: "40%", left: "30%",
            animation: "cloudFloat3 25s ease-in-out infinite alternate",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 w-full">
            {/* Left — sticky info */}
            <div className="flex flex-col justify-center">
              <p className="text-sm font-medium text-[#6C5CE7] mb-4 tracking-wider">HOW IT WORKS</p>
              {/* All steps share one grid cell, so the column is as tall as the
                  LONGEST step — a spacer sized to step 01 let 03/04 run into the dots. */}
              <div className="grid">
                {STEPS.map((step, i) => (
                  <div
                    key={step.number}
                    className="col-start-1 row-start-1 w-full transition-all duration-500"
                    style={{
                      opacity: activeStep === i ? 1 : 0,
                      transform: activeStep === i ? "translateX(0)" : activeStep > i ? "translateX(-20px)" : "translateX(20px)",
                    }}
                  >
                    <motion.p className="text-7xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: numColor }}>
                      {step.number} <span className="text-3xl" style={{ opacity: 0.4 }}>/ 04</span>
                    </motion.p>
                    <motion.h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold mb-4 leading-[1.2] pb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: titleColor }}>
                      {step.title}
                    </motion.h2>
                    <motion.p className="text-lg max-w-md leading-relaxed" style={{ color: descColor }}>{step.description}</motion.p>
                  </div>
                ))}
              </div>
              {/* Step dots */}
              <div className="flex gap-2 mt-8">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: activeStep === i ? 32 : 8,
                      backgroundColor: activeStep === i ? "#6C5CE7" : "#D9D1C0",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Right — scrollable panels (positioned absolute to allow scroll) */}
            <div className="hidden lg:block" />
          </div>
        </div>
      </div>

      {/* Scrollable right panels */}
      <div className="absolute top-0 right-0 w-1/2 hidden lg:block">
        {STEPS.map((_, i) => (
          <div
            key={i}
            ref={(el) => { panelRefs.current[i] = el; }}
            className="h-screen flex items-center justify-center px-8"
          >
            <div
              className="transition-all duration-500"
              style={{
                opacity: activeStep === i ? 1 : 0.2,
                transform: activeStep === i ? "scale(1) translateY(0)" : "scale(0.92) translateY(12px)",
              }}
            >
              {panels[i]}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: clean stacked steps in normal flow (desktop sticky-scroll is hidden on mobile). */}
      <div
        className="lg:hidden px-4 py-16"
        style={{ background: "linear-gradient(160deg, #FAF7F0 0%, #F8F4EC 50%, #FAF7F0 100%)" }}
      >
        <p className="text-sm font-semibold text-[#101014] mb-12 tracking-wider text-center">HOW IT WORKS</p>
        <div className="space-y-16">
          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <StepBadge label={step.badge} gradient={step.badgeColor} />
              <p className="text-xs font-semibold text-[#5C574F] mb-2 tracking-wide">STEP {step.number} / 04</p>
              <h3 className="text-2xl font-bold text-[#101014] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{step.title}</h3>
              <p className="text-sm text-[#5C574F] mb-6 max-w-sm">{step.description}</p>
              {panels[i]}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
