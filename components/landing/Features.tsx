"use client";

import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";
import Starfield from "./Starfield";

const features = [
  {
    title: "Your account stays safe",
    subtitle: "Ban-safe by design",
    description: "Applies from your own browser, at a human pace — the way you would, just faster. No captcha-cracking, no server bots that get accounts flagged.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "You stay in control",
    subtitle: "Review before send",
    description: "Nothing is submitted without your OK. Approve each application before it goes out — or switch to full auto. Your call, not ours.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l3 3 5-6" />
      </svg>
    ),
  },
  {
    title: "AI cover letters",
    subtitle: "In your voice",
    description: "A cover letter written for each role — matched to your tone and the job, not a generic template recruiters ignore.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "ATS-optimized resume",
    subtitle: "Passes the screeners",
    description: "We tailor and format your resume so it reads cleanly in employer systems and gets past the automated ATS filters.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M6 3h8l4 4v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1Z" />
        <path d="M14 3v4h4" />
        <path d="M8.5 14l2 2 4-4.5" />
      </svg>
    ),
  },
  {
    title: "Handles complex ATS",
    subtitle: "Workday · Greenhouse · Lever",
    description: "The multi-step application forms that eat your evening — filled out for you, end to end, not just quick one-click boards.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    title: "Smart job matching",
    subtitle: "Only worth-it roles",
    description: "Finds and scores jobs against your profile so you apply where you actually fit — quality targeting, not a blind blast.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="relative py-24 px-4 sm:px-6 lg:px-8"
      style={{
        // Night — the destination of the long day→night that begins up in
        // HowItWorks. Cards float on a starry sky; fades back to daylight at the
        // bottom for the next section.
        background: "linear-gradient(180deg, #17142a 0%, #14121f 60%, #14121f 100%)",
      }}
    >
      {/* starry sky across the section, fading out near the bottom */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{
          WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 72%, transparent 92%)",
          maskImage: "linear-gradient(180deg, #000 0%, #000 72%, transparent 92%)",
        }}
      >
        <Starfield />
      </div>
      {/* soft fade back to daylight, into the next section */}
      <div
        className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(0deg, #F7F7FB 0%, rgba(247,247,251,0.35) 45%, transparent 100%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 pb-2 leading-[1.32]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Everything you need to land your next job
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            A complete toolkit that handles the tedious parts of job searching so you can focus on what matters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <ScrollReveal key={feature.title} delay={i * 0.12}>
              <motion.div
                className="bg-white rounded-2xl p-6 border border-[#E8E8F0] h-full"
                style={{ boxShadow: "0 8px 30px rgba(20,18,31,0.12)" }}
                whileHover={{ y: -4, borderColor: "#6C5CE7", boxShadow: "0 16px 40px rgba(108,92,231,0.25)" }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-12 h-12 bg-[#EEE9FF] rounded-lg flex items-center justify-center text-[#6C5CE7] mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A2E] mb-1">{feature.title}</h3>
                <div className="text-xs font-medium text-[#6C5CE7] mb-3">{feature.subtitle}</div>
                <p className="text-sm text-[#6B6B8A]">{feature.description}</p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
