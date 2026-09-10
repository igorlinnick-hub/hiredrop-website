// Shared Open Graph card renderer.
//
// Until now the site had NO og:image at all — every link shared to LinkedIn, X,
// Slack or iMessage rendered as a bare grey row, which costs clicks on exactly
// the shares that earn backlinks. Each route segment gets a 3-line
// `opengraph-image.tsx` that calls ogImage() with its own headline.
//
// Constraints (satori, not a browser): flexbox only — no grid, no box-shadow
// filters, no webfonts unless we ship the file. Everything here is plain flex.

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/** OG spec size. Re-exported by every opengraph-image.tsx as `size`. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#13132B";
const ACCENT = "#6C5CE7";
const ACCENT_SOFT = "#A78BFA";

/**
 * Space Grotesk is the heading face on the site, so the share card uses it too —
 * a card in a different typeface reads as someone else's link.
 *
 * Static Bold instance, not the variable TTF Google ships: satori's font parser
 * chokes on variable fonts ("Cannot read properties of undefined"). Regenerate with
 *   python3 -c "from fontTools import ttLib; from fontTools.varLib import instancer;
 *   instancer.instantiateVariableFont(ttLib.TTFont(SRC), {'wght': 700},
 *   updateFontNames=True).save('assets/SpaceGrotesk-Bold.ttf')"
 * Licence: SIL Open Font License 1.1 (assets/SpaceGrotesk-OFL.txt).
 */
async function headingFont() {
  return readFile(join(process.cwd(), "assets", "SpaceGrotesk-Bold.ttf"));
}

export async function ogImage({
  kicker,
  title,
  footer = "hiredrop.io",
}: {
  /** Small label above the headline — the page's category ("Comparison", "Guide"). */
  kicker?: string;
  title: string;
  footer?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: INK,
          // Two soft accent washes instead of a flat field — reads as depth at
          // thumbnail size, which is the only size anyone sees this at.
          backgroundImage: `radial-gradient(900px 520px at 88% -12%, rgba(108,92,231,0.55), transparent 70%), radial-gradient(700px 480px at -10% 110%, rgba(167,139,250,0.28), transparent 70%)`,
          fontFamily: "Space Grotesk",
          color: "#FFFFFF",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            H
          </div>
          {/* satori requires an explicit display on any element with >1 child */}
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            <span style={{ color: ACCENT_SOFT }}>Hire</span>
            <span>Drop</span>
          </div>
        </div>

        {/* Headline block */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {kicker ? (
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                color: ACCENT_SOFT,
                marginBottom: 22,
              }}
            >
              {kicker}
            </div>
          ) : null}
          <div
            style={{
              fontSize: title.length > 64 ? 62 : 74,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
        </div>

        {/* Footer rule + domain */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", height: 4, width: 120, backgroundColor: ACCENT }} />
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.72)" }}>{footer}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        {
          name: "Space Grotesk",
          data: await headingFont(),
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
