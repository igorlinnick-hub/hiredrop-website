import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Guide: how to auto-apply to jobs on Indeed and what breaks";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage({ kicker: "Guide", title: "How to auto-apply to jobs on Indeed" });
}
