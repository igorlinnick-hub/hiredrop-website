import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/lib/og";

export const alt = "HireDrop vs LazyApply — volume blasting versus applications you approve";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImage({ kicker: "Comparison", title: "HireDrop vs LazyApply" });
}
