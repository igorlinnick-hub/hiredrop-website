"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Job listings ─── */
const JOBS = [
  { title: "Marketing Manager", company: "Stripe", location: "Remote", salary: "$130K", match: 97 },
  { title: "Growth Lead", company: "Notion", location: "San Francisco", salary: "$140K", match: 94 },
  { title: "Content Strategist", company: "Vercel", location: "Remote", salary: "$120K", match: 91 },
  { title: "Digital Marketing", company: "Figma", location: "New York", salary: "$115K", match: 88 },
];

/* ─── Form fields for auto-fill ─── */
const FORM_FIELDS = [
  { label: "Full Name", value: "Alex Johnson" },
  { label: "Email", value: "alex@gmail.com" },
  { label: "Phone", value: "+1 (555) 234-5678" },
];

/* ─── Cover letter text ─── */
const COVER_TEXT =
  "I'm excited to bring my 5+ years of growth marketing experience to Stripe. My campaigns have driven 340% pipeline growth — I'd love to do the same for your team.";

/* ─── Timeline phases ─── */
type Phase = 0 | 1 | 2 | 3 | 4 | 5;
//  0 = idle (extension appears)
//  1 = scanning jobs
//  2 = matches found
//  3 = auto-filling form
//  4 = writing cover letter
//  5 = submitted!

export default function ChromeExtensionDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>(0);
  const [scanIndex, setScanIndex] = useState(-1);
  const [fillIndex, setFillIndex] = useState(-1);
  const [typedChars, setTypedChars] = useState(0);
  const [cycle, setCycle] = useState(0);

  // Intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.05 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Reset helper
  const reset = useCallback(() => {
    setPhase(0);
    setScanIndex(-1);
    setFillIndex(-1);
    setTypedChars(0);
    setCycle((c) => c + 1);
  }, []);

  // Main timeline
  useEffect(() => {
    if (!visible) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)); };

    // Phase 0→1: start scanning (0.6s)
    t(() => setPhase(1), 600);
    // Scan each job
    t(() => setScanIndex(0), 900);
    t(() => setScanIndex(1), 1300);
    t(() => setScanIndex(2), 1700);
    t(() => setScanIndex(3), 2100);
    // Phase 1→2: matches found
    t(() => setPhase(2), 2600);
    // Phase 2→3: open first job, start filling
    t(() => setPhase(3), 3800);
    t(() => setFillIndex(0), 4200);
    t(() => setFillIndex(1), 5000);
    t(() => setFillIndex(2), 5800);
    // Phase 3→4: write cover letter
    t(() => setPhase(4), 6600);
    // Phase 4→5: done
    t(() => setPhase(5), 9200);
    // Restart
    t(reset, 11500);

    return () => timers.forEach(clearTimeout);
  }, [visible, cycle, reset]);

  // Typewriter for cover letter
  useEffect(() => {
    if (phase !== 4) return;
    setTypedChars(0);
    const interval = setInterval(() => {
      setTypedChars((c) => {
        if (c >= COVER_TEXT.length) { clearInterval(interval); return COVER_TEXT.length; }
        return c + 2;
      });
    }, 25);
    return () => clearInterval(interval);
  }, [phase]);

  const isScanning = phase === 1;
  const showMatches = phase >= 2;
  const showForm = phase >= 3;
  const showCover = phase >= 4;
  const isDone = phase === 5;

  return (
    <section id="chrome-demo" ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #6C5CE7, transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#EEE9FF] rounded-full mb-5">
            <div className="w-2 h-2 rounded-full bg-[#6C5CE7] animate-pulse" />
            <span className="text-sm font-medium text-[#6C5CE7]">Chrome Extension</span>
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] mb-4"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Watch the extension work
          </h2>
          <p className="text-lg text-[#6B6B8A] max-w-xl mx-auto">
            It scans, matches, fills forms, and applies — all while you grab a coffee.
          </p>
        </div>

        {/* ═══ MAIN DEMO FRAME ═══ */}
        <div className="relative">
          {/* Glow behind frame */}
          <div
            className="absolute -inset-3 rounded-[24px] opacity-60 blur-2xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(108,92,231,0.15), rgba(167,139,250,0.1), rgba(0,184,148,0.08))",
            }}
          />

          {/* Outer frame */}
          <div
            className="relative rounded-[18px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(108,92,231,0.12), rgba(167,139,250,0.06))",
              padding: "1px",
            }}
          >
            <div className="rounded-[17px] overflow-hidden bg-white">
              {/* ─── Chrome title bar ─── */}
              <div className="bg-[#f8f8fa] px-4 py-2 flex items-center gap-3 border-b border-[#ebebef]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex items-center bg-white rounded-lg px-3 py-1 border border-[#e5e5ea] flex-1 max-w-md">
                  <svg className="w-3 h-3 text-[#aaa] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[11px] text-[#666] truncate">
                    {showForm ? "indeed.com/jobs/apply/marketing-manager-stripe" : "indeed.com/jobs?q=marketing+manager&l=remote"}
                  </span>
                </div>

                {/* Extension icon */}
                <div className="ml-auto flex items-center gap-2">
                  <div
                    className="relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-400"
                    style={{
                      background: phase >= 1 ? "linear-gradient(135deg, #6C5CE7, #a78bfa)" : "#e8e8f0",
                      boxShadow: phase >= 1 && phase < 5 ? "0 0 12px rgba(108,92,231,0.4)" : "none",
                    }}
                  >
                    <span className="text-[7px] font-bold" style={{ color: phase >= 1 ? "white" : "#999" }}>JF</span>
                    {phase >= 1 && phase < 5 && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00B894]">
                        <div className="absolute inset-0 rounded-full bg-[#00B894] animate-ping opacity-75" />
                      </div>
                    )}
                    {isDone && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00B894] flex items-center justify-center">
                        <svg className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Page content ─── */}
              <div className="relative min-h-[440px] sm:min-h-[460px]">
                {/* === VIEW 1: Job listings === */}
                <div
                  className="absolute inset-0 p-5 transition-all duration-500"
                  style={{
                    opacity: showForm ? 0 : 1,
                    transform: showForm ? "translateX(-30px)" : "translateX(0)",
                    pointerEvents: showForm ? "none" : "auto",
                  }}
                >
                  {/* Indeed-style header */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#f0f0f5]">
                    <div className="w-6 h-6 rounded bg-[#2557a7] flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">in</span>
                    </div>
                    <span className="text-sm font-semibold text-[#2d2d2d]">Marketing Manager</span>
                    <span className="text-xs text-[#767676]">— Remote — 2,847 results</span>
                  </div>

                  {/* Job cards */}
                  <div className="space-y-2.5">
                    {JOBS.map((job, i) => {
                      const isBeingScanned = isScanning && scanIndex === i;
                      const isMatched = showMatches && scanIndex >= i;
                      return (
                        <div
                          key={job.title}
                          className="p-3 rounded-lg border transition-all duration-400"
                          style={{
                            borderColor: isMatched ? "#6C5CE7" : isBeingScanned ? "#a78bfa" : "#f0f0f5",
                            backgroundColor: isMatched ? "#faf8ff" : isBeingScanned ? "#fdfcff" : "white",
                            boxShadow: isBeingScanned ? "0 0 0 2px rgba(108,92,231,0.15)" : isMatched ? "0 2px 8px rgba(108,92,231,0.06)" : "none",
                            transform: isBeingScanned ? "scale(1.01)" : "scale(1)",
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-semibold text-[#2557a7]">{job.title}</p>
                                {isMatched && (
                                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#EEE9FF] text-[#6C5CE7] animate-[fadeInUp_0.3s_ease_both]">
                                    {job.match}% match
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#2d2d2d] mt-0.5">{job.company}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-[#767676]">{job.location}</span>
                                <span className="text-[10px] text-[#767676]">·</span>
                                <span className="text-[10px] text-[#767676]">{job.salary}</span>
                              </div>
                            </div>
                          </div>

                          {/* Scanning indicator */}
                          {isBeingScanned && (
                            <div className="mt-2 h-0.5 bg-[#EEE9FF] rounded-full overflow-hidden">
                              <div className="h-full w-full bg-gradient-to-r from-[#6C5CE7] to-[#a78bfa] animate-[scanPulse_0.8s_ease_infinite]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* === VIEW 2: Application form === */}
                <div
                  className="absolute inset-0 p-5 transition-all duration-500"
                  style={{
                    opacity: showForm ? 1 : 0,
                    transform: showForm ? "translateX(0)" : "translateX(30px)",
                    pointerEvents: showForm ? "auto" : "none",
                  }}
                >
                  {/* Job header */}
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#f0f0f5]">
                    <div>
                      <p className="text-sm font-semibold text-[#2d2d2d]">Apply: Marketing Manager</p>
                      <p className="text-[11px] text-[#767676]">Stripe · Remote · $130K</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full transition-colors duration-300"
                        style={{ backgroundColor: isDone ? "#00B894" : "#6C5CE7" }}
                      />
                      <span className="text-[10px] font-medium" style={{ color: isDone ? "#00B894" : "#6C5CE7" }}>
                        {isDone ? "Submitted!" : showCover ? "Writing cover letter..." : "Auto-filling..."}
                      </span>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3 mb-4">
                    {FORM_FIELDS.map((field, i) => {
                      const isFilled = fillIndex >= i;
                      const isFilling = fillIndex === i && phase === 3;
                      return (
                        <div key={field.label}>
                          <label className="text-[10px] font-medium text-[#999] mb-1 block">{field.label}</label>
                          <div
                            className="border rounded-lg px-3 py-2 text-[12px] min-h-[34px] transition-all duration-300 flex items-center"
                            style={{
                              borderColor: isFilling ? "#6C5CE7" : isFilled ? "#00B894" : "#e8e8f0",
                              backgroundColor: isFilled ? "#f8fffe" : "white",
                              boxShadow: isFilling ? "0 0 0 3px rgba(108,92,231,0.1)" : "none",
                            }}
                          >
                            {isFilled ? (
                              <span className="text-[#2d2d2d] animate-[fadeInUp_0.3s_ease_both]">{field.value}</span>
                            ) : isFilling ? (
                              <span className="text-[#6C5CE7]">
                                {field.value}
                                <span className="inline-block w-[2px] h-3 bg-[#6C5CE7] ml-0.5 animate-pulse align-middle" />
                              </span>
                            ) : (
                              <span className="text-[#ccc]">{field.label}...</span>
                            )}
                            {isFilled && !isFilling && (
                              <svg className="w-3.5 h-3.5 text-[#00B894] ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Resume */}
                    <div>
                      <label className="text-[10px] font-medium text-[#999] mb-1 block">Resume</label>
                      <div
                        className="border border-dashed rounded-lg px-3 py-2 text-[11px] transition-all duration-300"
                        style={{
                          borderColor: fillIndex >= 2 ? "#00B894" : "#e8e8f0",
                          backgroundColor: fillIndex >= 2 ? "#f8fffe" : "white",
                          color: fillIndex >= 2 ? "#00B894" : "#ccc",
                        }}
                      >
                        {fillIndex >= 2 ? (
                          <span className="flex items-center gap-1.5 animate-[fadeInUp_0.3s_ease_both]">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            resume_alex_johnson.pdf uploaded
                          </span>
                        ) : "Attach resume..."}
                      </div>
                    </div>

                    {/* Cover letter */}
                    <div>
                      <label className="text-[10px] font-medium text-[#999] mb-1 block">
                        Cover Letter
                        {showCover && !isDone && (
                          <span className="ml-2 text-[#6C5CE7] font-normal">AI generating...</span>
                        )}
                      </label>
                      <div
                        className="border rounded-lg px-3 py-2.5 min-h-[72px] transition-all duration-300 text-[11px] leading-relaxed"
                        style={{
                          borderColor: showCover ? (isDone ? "#00B894" : "#6C5CE7") : "#e8e8f0",
                          backgroundColor: showCover ? (isDone ? "#f8fffe" : "#faf8ff") : "white",
                          boxShadow: showCover && !isDone ? "0 0 0 3px rgba(108,92,231,0.08)" : "none",
                        }}
                      >
                        {showCover ? (
                          <span className="text-[#444]">
                            {COVER_TEXT.slice(0, typedChars)}
                            {!isDone && (
                              <span className="inline-block w-[2px] h-3 bg-[#6C5CE7] ml-0.5 animate-pulse align-middle" />
                            )}
                          </span>
                        ) : (
                          <span className="text-[#ccc]">Write a cover letter...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <div
                    className="w-full text-center py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-500"
                    style={{
                      background: isDone ? "linear-gradient(135deg, #00B894, #00d4aa)" : phase >= 3 ? "linear-gradient(135deg, #6C5CE7, #a78bfa)" : "#e8e8f0",
                      color: phase >= 3 ? "white" : "#999",
                      boxShadow: isDone ? "0 4px 16px rgba(0,184,148,0.3)" : phase >= 3 ? "0 4px 16px rgba(108,92,231,0.25)" : "none",
                      transform: isDone ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    {isDone ? "✓ Application Submitted!" : "Submit Application"}
                  </div>
                </div>

                {/* ─── Extension popup overlay ─── */}
                <div
                  className="absolute top-3 right-3 w-[200px] sm:w-[220px] rounded-xl overflow-hidden transition-all duration-500 z-10"
                  style={{
                    opacity: phase >= 1 && !showForm ? 1 : 0,
                    transform: phase >= 1 && !showForm ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.95)",
                    boxShadow: "0 16px 48px rgba(108,92,231,0.25), 0 0 0 1px rgba(108,92,231,0.1)",
                    pointerEvents: "none",
                  }}
                >
                  <div className="bg-gradient-to-r from-[#6C5CE7] to-[#a78bfa] px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center">
                        <span className="text-white text-[6px] font-bold">JF</span>
                      </div>
                      <span className="text-white text-[10px] font-semibold">HireDrop</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00B894]" />
                      <span className="text-white/70 text-[8px]">Active</span>
                    </div>
                  </div>
                  <div className="bg-white p-3">
                    <div className="space-y-2">
                      {[
                        { label: "Scanning page...", active: phase >= 1 },
                        { label: `${JOBS.length} matches found`, active: phase >= 2 },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2" style={{ opacity: item.active ? 1 : 0.3 }}>
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: item.active && phase > i + 1 ? "#00B894" : item.active ? "#6C5CE7" : "#e8e8f0" }}
                          >
                            {item.active && phase > i + 1 ? (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : item.active ? (
                              <div className="w-2 h-2 rounded-full border border-white border-t-transparent animate-spin" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#ccc]" />
                            )}
                          </div>
                          <span className="text-[9px] font-medium text-[#1A1A2E]">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    {phase === 2 && (
                      <div className="mt-2.5 text-center">
                        <span className="text-[9px] text-[#6C5CE7] font-medium animate-pulse">
                          Opening first match...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
          {[
            { value: "23 min", label: "saved per application" },
            { value: "94%", label: "form accuracy" },
            { value: "50/day", label: "applications limit" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="text-center transition-all duration-700"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(12px)",
                transitionDelay: `${0.8 + i * 0.15}s`,
              }}
            >
              <p className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Syne', sans-serif" }}>
                {stat.value}
              </p>
              <p className="text-[11px] text-[#6B6B8A] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
