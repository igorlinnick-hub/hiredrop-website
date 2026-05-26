"use client";

import Link from "next/link";
import ScrollReveal from "./ScrollReveal";

export default function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#6C5CE7]">
      <ScrollReveal className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
          Ready to automate your job search?
        </h2>
        <p className="text-lg text-white/80 mb-8">
          Join HireDrop and start receiving interview invitations instead of sending applications manually.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-white text-[#6C5CE7] font-semibold px-8 py-3.5 rounded-[10px] text-lg shadow-lg"
          style={{ transition: "transform 0.15s, box-shadow 0.15s" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)";
          }}
        >
          Get Started Free
        </Link>
      </ScrollReveal>
    </section>
  );
}
