import { Inter, Instrument_Serif, Space_Grotesk } from "next/font/google";

/**
 * The site's three faces, self-hosted by next/font and exposed as CSS
 * variables on <html> (app/layout.tsx). Use the variables, never the family
 * names: next/font serves each face under its own generated name, so a
 * literal "'Space Grotesk'" in a style no longer matches anything.
 *
 *   var(--hd-font-sans)     Inter — body and app UI
 *   var(--hd-font-display)  Space Grotesk — marketing headings, big numbers
 *   var(--hd-font-serif)    Instrument Serif — dashboard poster/skills accents
 *
 * Before 10-05 these came from a render-blocking fonts.googleapis.com <link>:
 * no page painted until Google's stylesheet arrived (~0.7 s cold on prod).
 * Prefixed `--hd-` so they never collide with Tailwind's own --font-* theme vars.
 * Canvas drawing can't read a CSS variable — use `display.style.fontFamily`.
 */
export const sans = Inter({
  subsets: ["latin"],
  variable: "--hd-font-sans",
  display: "swap",
});

export const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--hd-font-display",
  display: "swap",
});

// Only a few dashboard surfaces use it — not worth a preload on every page.
export const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--hd-font-serif",
  display: "swap",
  preload: false,
});
