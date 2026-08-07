"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ExtensionTokenSync from "@/components/dashboard/ExtensionTokenSync";
import FitModeMenu from "@/components/dashboard/FitModeMenu";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Platforms",
    href: "/dashboard/platforms",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Extension",
    href: "/extension",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  // Night mode is scoped to the dashboard subtree (not the whole site — the marketing
  // pages use hardcoded light surfaces). Set in an effect (not the initializer) so SSR
  // and first client render agree; the swap is one frame on this authed page.
  const [dark, setDark] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email || "");
    }
    loadUser();
    try { setDark(localStorage.getItem("hd_theme") === "dark"); } catch { /* noop */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTheme() {
    setDark((d) => {
      const next = !d;
      try { localStorage.setItem("hd_theme", next ? "dark" : "light"); } catch { /* noop */ }
      return next;
    });
  }

  async function handleLogout() {
    // Tell the extension to wipe its user-scoped state (durable key, cached
    // profile, dedup history, platform statuses) — chrome.storage is
    // browser-scoped, so without this the extension keeps acting as the
    // logged-out user for whoever signs in next. Fire-and-forget: ping.js
    // relays it; if the extension isn't installed, nobody is listening.
    window.postMessage({ type: "HIREDROP_LOGOUT" }, "*");
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className={["min-h-screen bg-background hd-dash-root", dark ? "dark" : ""].join(" ")}>
      {/* Keeps the extension's token fresh while any dashboard page is open. */}
      <ExtensionTokenSync />
      {/* Top bar */}
      <header className="border-b border-border bg-surface">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/dashboard" className="text-lg font-bold text-text">
            <span className="text-accent">Hire</span>Drop
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <FitModeMenu />
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
            <ProfileMenu email={email} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Nav tabs */}
        <nav className="flex flex-wrap gap-1.5 mb-8">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition",
                  active
                    ? "nav-active bg-accent/10 text-accent"
                    : "text-text2 hover:text-text hover:bg-surface2/70",
                ].join(" ")}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </div>
  );
}

// Day/night switch. Shows the mode you'll switch TO (moon in day, sun at night).
// The `.dark .theme-toggle` rule in globals.css gives it a neon edge when night is on.
function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Switch to day mode" : "Switch to night mode"}
      title={dark ? "Day mode" : "Night mode"}
      className="theme-toggle inline-flex items-center justify-center w-9 h-9 rounded-full border border-border
        text-text2 hover:text-accent hover:border-accent/50 transition"
    >
      {dark ? (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7}
          viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7}
          viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
        </svg>
      )}
    </button>
  );
}

const PersonIcon = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5.5 20a6.5 6.5 0 0113 0" />
  </svg>
);

// Account menu — avatar + hamburger trigger; a panel scales out of the top-right
// corner (animation + neon edge live in globals.css). Closes on outside-click / Escape.
function ProfileMenu({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (email.trim()[0] || "").toUpperCase();

  const items = [
    {
      label: "My profile",
      href: "/dashboard/settings",
      icon: <PersonIcon />,
    },
    {
      label: "Billing",
      href: "/dashboard/settings#billing",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path strokeLinecap="round" d="M3 10h18M7 15h4" />
        </svg>
      ),
    },
    {
      label: "Security & password",
      href: "/auth/update-password",
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" />
          <path d="M9.5 12l1.8 1.8L15 10.2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="profile-trigger flex items-center gap-2 rounded-full border border-border pl-1 pr-2.5 py-1
          text-text2 hover:text-text hover:border-accent/40 transition"
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-white text-xs font-bold">
          {initial || <PersonIcon className="w-4 h-4" />}
        </span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="profile-menu absolute right-0 top-[calc(100%+10px)] w-64 rounded-2xl border border-border
            bg-surface shadow-xl p-2 z-50"
        >
          {/* Identity */}
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent text-white text-sm font-bold shrink-0">
              {initial || <PersonIcon />}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-text2/70">Signed in as</p>
              <p className="text-sm font-medium text-text truncate">{email || "—"}</p>
            </div>
          </div>

          <div className="my-1.5 h-px bg-border" />

          {items.map((it) => (
            <Link
              key={it.label}
              href={it.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-text hover:bg-surface2 transition"
            >
              <span className="text-text2">{it.icon}</span>
              {it.label}
            </Link>
          ))}

          <div className="my-1.5 h-px bg-border" />

          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-red hover:bg-red/10 transition"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
