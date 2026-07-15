"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import DecorMarks from "./DecorMarks";

export default function GradientCTA() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0f0f17]">
      {/* descend into night — long soft fade from the light section above */}
      <div className="absolute top-0 inset-x-0 h-60 z-[1] pointer-events-none" style={{ background: "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.5) 28%, rgba(30,26,45,0.2) 64%, rgba(15,15,23,0) 100%)" }} />
      {/* Animated gradient blobs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-40"
        style={{
          background: "radial-gradient(circle, #6C5CE7 0%, transparent 70%)",
          filter: "blur(80px)",
          top: "-10%",
          left: "-5%",
          animation: "blob1 20s ease infinite alternate",
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)",
          filter: "blur(80px)",
          bottom: "-10%",
          right: "-5%",
          animation: "blob2 20s ease infinite alternate",
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, #e8d5ff 0%, transparent 70%)",
          filter: "blur(80px)",
          top: "30%",
          left: "35%",
          animation: "blob3 20s ease infinite alternate",
        }}
      />
      <DecorMarks />

      {/* Card */}
      <motion.div
        className="relative z-10 bg-white rounded-3xl p-12 max-w-[600px] w-full mx-4 text-center"
        style={{ boxShadow: "0 24px 80px rgba(108,92,231,0.15)" }}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2
          className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] mb-4"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Ready to land your<br />next job?
        </h2>
        <p className="text-[#6B6B8A] mb-8">
          The safe way to apply — $9/week or $29/month. Cancel anytime.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-[#1A1A2E] text-white font-medium px-8 py-3.5 rounded-full text-lg"
          style={{ transition: "transform 0.15s, box-shadow 0.15s" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Start applying
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </motion.div>
    </section>
  );
}
