"use client";

import { useEffect, useRef, useState } from "react";

const COVER_TEXT = "Dear Hiring Manager,\n\nI'm thrilled to apply for the Marketing Manager role at Stripe. With 5+ years driving growth campaigns that increased pipeline by 340%, I bring exactly the data-driven creativity your team needs...";

function Spinner({ done }: { done: boolean }) {
  if (done) {
    return (
      <div className="w-5 h-5 rounded-full bg-[#00B894] flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full border-2 border-[#6C5CE7] border-t-transparent animate-spin" />
  );
}

export default function AIProcess() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    // Step 0: scanning (1.5s)
    const t1 = setTimeout(() => setStep(1), 1800);
    // Step 1: matching (1.5s)
    const t2 = setTimeout(() => setStep(2), 3600);
    // Step 2: writing (2s)
    const t3 = setTimeout(() => setStep(3), 6000);
    // Restart loop
    const t4 = setTimeout(() => {
      setStep(0);
      setProgress(0);
      setJobCount(0);
      setTypedChars(0);
    }, 7500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [visible, step === 0 ? Date.now() : 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress bar for step 1
  useEffect(() => {
    if (step !== 1) return;
    setProgress(0);
    setJobCount(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
      setJobCount((c) => {
        if (c >= 47) return 47;
        return c + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [step]);

  // Typewriter for step 2
  useEffect(() => {
    if (step !== 2) return;
    setTypedChars(0);
    const interval = setInterval(() => {
      setTypedChars((c) => {
        if (c >= COVER_TEXT.length) { clearInterval(interval); return COVER_TEXT.length; }
        return c + 1;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [step]);

  return (
    <section ref={ref} className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0f0f17]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Watch AI work for you
          </h2>
          <p className="text-lg text-gray-400">
            From resume to a tailored application in seconds — you review before it sends.
          </p>
        </div>

        <div className="bg-[#1a1d27] rounded-[10px] border border-[#2e3348] p-6 sm:p-8">
          <div className="space-y-6">
            {/* Step 1: Reading resume */}
            <div className={`flex items-start gap-4 transition-opacity duration-300 ${step >= 0 && visible ? "opacity-100" : "opacity-30"}`}>
              <Spinner done={step > 0} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-2">Reading resume...</p>
                {step === 0 && visible && (
                  <div className="bg-[#242836] rounded-lg p-3 relative overflow-hidden">
                    <div className="space-y-1.5 text-xs text-gray-500" style={{ filter: "blur(0.5px)" }}>
                      <p>Igor Linnik — Marketing Professional</p>
                      <p>5+ years experience in growth marketing</p>
                      <p>Skills: SEO, Content Strategy, Analytics</p>
                    </div>
                    <div className="absolute left-0 right-0 h-[2px] bg-[#6C5CE7] animate-[scanLine_1.5s_ease_infinite]" />
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Matching jobs */}
            <div className={`flex items-start gap-4 transition-opacity duration-300 ${step >= 1 ? "opacity-100" : "opacity-30"}`}>
              <Spinner done={step > 1} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-2">
                  Matching {step >= 1 ? jobCount : 0} jobs...
                </p>
                {step === 1 && (
                  <div>
                    <div className="h-2 bg-[#242836] rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-[#6C5CE7] rounded-full transition-all duration-75"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {["Marketing Manager @ Stripe", "Growth Lead @ Notion", "Content @ Vercel"].map((job, i) => (
                        <span
                          key={job}
                          className="text-[10px] bg-[#242836] text-gray-400 px-2 py-1 rounded-md animate-[fadeInUp_0.3s_ease_both]"
                          style={{ animationDelay: `${0.3 + i * 0.3}s` }}
                        >
                          {job}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Writing cover letter */}
            <div className={`flex items-start gap-4 transition-opacity duration-300 ${step >= 2 ? "opacity-100" : "opacity-30"}`}>
              <Spinner done={step > 2} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-2">Writing cover letter...</p>
                {step === 2 && (
                  <div className="bg-[#242836] rounded-lg p-3">
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {COVER_TEXT.slice(0, typedChars)}
                      <span className="inline-block w-[2px] h-3.5 bg-[#6C5CE7] ml-0.5 animate-pulse align-middle" />
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Done state */}
            {step >= 3 && (
              <div className="text-center pt-2 animate-[fadeInUp_0.4s_ease_both]">
                <p className="text-sm font-medium text-[#00B894]">
                  ✓ Application submitted to Stripe
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
