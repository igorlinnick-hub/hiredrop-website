import Link from "next/link";

import { ALTERNATIVES, GUIDES } from "@/lib/content-index";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div>
            <Link href="/" className="text-xl font-bold text-white">
              <span className="text-accent2">Hire</span>Drop
            </Link>
            <p className="mt-3 text-sm">
              Job search on autopilot. Find jobs, generate cover letters, and auto-apply.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              {/* Root-relative: a bare "#pricing" goes nowhere from /guides/* */}
              <li><Link href="/#how-it-works" className="hover:text-white transition">How it works</Link></li>
              <li><Link href="/#features" className="hover:text-white transition">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-white transition">Pricing</Link></li>
              <li><Link href="/extension" className="hover:text-white transition">Chrome Extension</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              {[...GUIDES, ...ALTERNATIVES].map((entry) => (
                <li key={entry.path}>
                  <Link href={entry.path} className="hover:text-white transition">
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/faq" className="hover:text-white transition">FAQ</Link></li>
              <li><Link href="/affiliate" className="hover:text-white transition">Affiliate Program</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              {/* CCPA/CPRA opt-out of "sharing" for ad measurement — must be reachable from every public page. */}
              <li><Link href="/privacy/choices" className="hover:text-white transition">Your Privacy Choices</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Log in</Link></li>
              <li><Link href="/signup" className="hover:text-white transition">Sign up</Link></li>
            </ul>
          </div>
        </div>

        {/* Google's brand verification reads the home page for what the app
            does and for an explicit "no AI imagery of people" statement — it
            rejected HireDrop once without one (30.09). Keep it accurate if
            the product starts touching images or more Google data. */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-xs leading-relaxed max-w-4xl">
          <h4 className="text-sm font-semibold text-white mb-2">About HireDrop</h4>
          <p>
            HireDrop is a job-application assistant for job seekers in the United States. It finds
            openings that match your resume and preferences, writes a tailored resume, cover letter,
            and answers to application questions for each one, and submits applications from your own
            browser after you approve them. Its AI works with text only: it does not create, edit, or
            analyze images or video of people, and never produces intimate or sexual imagery.
          </p>
          <p className="mt-2">
            Google Sign-In is optional and is used only to create and sign in to your HireDrop
            account; from Google we use only your name and email address. See our{" "}
            <Link href="/privacy" className="underline hover:text-white transition">Privacy Policy</Link>.
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-center">
          &copy; {new Date().getFullYear()} HireDrop. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
