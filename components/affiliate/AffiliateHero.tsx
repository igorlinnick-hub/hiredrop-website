import Link from "next/link";

import AffiliateCta from "./AffiliateCta";
import PeopleCluster from "./PeopleCluster";

/**
 * The affiliate hero — one block reused on the public page, the application
 * form and the dashboard screen, because Igor asked for the same arrangement in
 * all three (2026-09-21, Notetaker's hero as the reference).
 *
 * It follows the panel language already approved on the skills dialog
 * (components/dashboard/PosterPanel.tsx): dark ground, serif headline with the
 * emphasis in an italic word, one sans sub-line, a single pale button. What the
 * reference adds is that the right half is PHOTOGRAPHY — here, the people an
 * affiliate would actually send us.
 */

const SERIF = "'Instrument Serif', 'Playfair Display', Georgia, serif";

interface Props {
  eyebrow?: string;
  title: React.ReactNode;
  body: React.ReactNode;
  cta?: { label: string; href: string };
  /** Let the button choose its own destination from the session. */
  smartCta?: { label: string };
  note?: React.ReactNode;
  /** Dashboard variant: shorter, no button — the link itself sits below it. */
  compact?: boolean;
}

export default function AffiliateHero({
  eyebrow,
  title,
  body,
  cta,
  smartCta,
  note,
  compact,
}: Props) {
  return (
    <section
      className="relative overflow-hidden rounded-[20px]"
      style={{ background: "#0A0710" }}
    >
      {/* Bokeh, not an image: the reference's ground is a photograph thrown far
          out of focus, and two wide radial washes read the same way at a
          fraction of the bytes — and never fight the faces for attention. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 78% 18%, rgba(217,143,74,.42) 0%, rgba(217,143,74,0) 58%)," +
            "radial-gradient(90% 80% at 8% 90%, rgba(124,92,214,.38) 0%, rgba(124,92,214,0) 60%)," +
            "radial-gradient(70% 60% at 52% 8%, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 70%)",
        }}
      />
      {/* Keeps the type side dark enough to read no matter how bright the
          circles behind it get. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(8,5,14,.94) 0%, rgba(8,5,14,.80) 40%, rgba(8,5,14,.18) 78%, rgba(8,5,14,.05) 100%)",
        }}
      />

      <div
        className={`relative grid gap-8 md:grid-cols-[1.05fr_0.95fr] md:items-center ${
          compact ? "p-7 sm:p-8" : "p-8 sm:p-10 lg:p-12"
        }`}
      >
        <div>
          {eyebrow && (
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">
              {eyebrow}
            </p>
          )}
          <h1
            className={`max-w-[13ch] text-white ${
              compact
                ? "text-[30px] leading-[1.08] sm:text-[34px]"
                : "text-[36px] leading-[1.06] sm:text-[44px] lg:text-[50px]"
            }`}
            style={{ fontFamily: SERIF, letterSpacing: "-0.015em" }}
          >
            {title}
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">{body}</p>

          {smartCta && <AffiliateCta label={smartCta.label} />}
          {cta && (
            <Link
              href={cta.href}
              className="mt-7 inline-block rounded-full bg-[#F3EFE7] px-7 py-3.5 text-[15px] font-semibold text-[#14100C] transition hover:bg-white"
            >
              {cta.label}
            </Link>
          )}
          {note && <p className="mt-4 max-w-md text-[12.5px] leading-relaxed text-white/45">{note}</p>}
        </div>

        {/* Bleeds past the panel's padding on the right: the reference's
            collage runs to the edge, and a politely inset photo looks pasted
            in rather than photographed. */}
        <div className="relative -mr-2 sm:-mr-4 md:-mr-6 lg:-mr-8">
          <PeopleCluster />
        </div>
      </div>
    </section>
  );
}
