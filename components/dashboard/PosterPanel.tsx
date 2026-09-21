"use client";

/**
 * The poster block: a settings section where the panel IS the picture.
 *
 * Igor approved this language on the skills dialog (2026-09-20, Flow as the
 * reference) and then asked for Settings to alternate — a black-and-white panel,
 * then a picture, then black-and-white, then a picture. This is the picture half,
 * extracted so every such block speaks the same way instead of being re-invented:
 * dark blurred ground, serif line with the emphasis in an italic word, one sans
 * sub-line, cream primary button.
 *
 * `image` names a plate in public/bg. They are ours — generated from our own
 * renders by brand-visuals/skills-photo.py — so no outside art enters the product.
 */

export const POSTER_SERIF = "'Instrument Serif', 'Playfair Display', Georgia, serif";

export interface PosterPanelProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  body?: React.ReactNode;
  image?: string;
  badge?: React.ReactNode;
  id?: string;
  testId?: string;
}

export default function PosterPanel({
  title, children, body, image = "/bg/skills-photo.jpg", badge, id, testId,
}: PosterPanelProps) {
  return (
    <div
      id={id}
      className="relative overflow-hidden rounded-2xl scroll-mt-24"
      style={{ background: "#0A0710" }}
      data-testid={testId}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `url("${image}") center / cover no-repeat` }}
      />
      {/* Type lives left, so the scrim stays heaviest there and lets the plate
          show on the right rather than drowning it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(8,5,14,.92) 0%, rgba(8,5,14,.74) 44%, rgba(8,5,14,.30) 100%)",
        }}
      />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              className="text-[24px] leading-tight tracking-[-0.01em] text-white sm:text-[28px]"
              style={{ fontFamily: POSTER_SERIF }}
            >
              {title}
            </h3>
            {body && (
              <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-white/75">{body}</p>
            )}
          </div>
          {badge}
        </div>
        {children}
      </div>
    </div>
  );
}
