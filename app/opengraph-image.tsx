import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";

export const alt = "HireDrop — apply to more jobs without risking your account";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Site-wide default card. Route segments with their own opengraph-image.tsx
// override this one.
export default async function Image() {
  return ogImage({
    kicker: "AI auto-apply",
    title: "Apply to more jobs — without risking your account.",
  });
}
