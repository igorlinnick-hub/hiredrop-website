"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="text-[#6C5CE7]">Hire</span>Drop
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: "How it works", href: "#how-it-works" },
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative text-sm text-[#6B6B8A] hover:text-[#1A1A2E] transition-colors group"
              >
                {link.label}
                <span className="absolute bottom-[-2px] left-0 w-0 h-[1.5px] bg-[#6C5CE7] transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
            <Link
              href="/login"
              className="relative text-sm text-[#6B6B8A] hover:text-[#1A1A2E] transition-colors group"
            >
              Log in
              <span className="absolute bottom-[-2px] left-0 w-0 h-[1.5px] bg-[#6C5CE7] transition-all duration-200 group-hover:w-full" />
            </Link>
            <Link
              href="/signup"
              className="bg-[#6C5CE7] text-white text-sm font-medium px-4 py-2 rounded-[10px]"
              style={{ transition: "transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(108,92,231,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Start applying
            </Link>
          </nav>

          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-[#1A1A2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-[#E8E8F0]">
            <div className="flex flex-col gap-3 pt-4">
              <a href="#how-it-works" className="text-sm text-[#6B6B8A] hover:text-[#1A1A2E]" onClick={() => setMenuOpen(false)}>
                How it works
              </a>
              <a href="#features" className="text-sm text-[#6B6B8A] hover:text-[#1A1A2E]" onClick={() => setMenuOpen(false)}>
                Features
              </a>
              <a href="#pricing" className="text-sm text-[#6B6B8A] hover:text-[#1A1A2E]" onClick={() => setMenuOpen(false)}>
                Pricing
              </a>
              <Link href="/login" className="text-sm text-[#6B6B8A] hover:text-[#1A1A2E]">
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-[#6C5CE7] text-white text-sm font-medium px-4 py-2 rounded-[10px] text-center"
              >
                Start applying
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
