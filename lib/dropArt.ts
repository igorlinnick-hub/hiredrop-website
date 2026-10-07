// Drop's art loaded by plain <img>/<video> (public/character, onboarding/step-N) is replaced
// in place under the same names and served with a day of browser cache + a week of
// stale-while-revalidate (next.config.ts PUBLIC_ART_CACHE). Without a version in the URL a
// returning visitor keeps the old art for a day or more — the blush-free Drop (web #297)
// showed with pink cheeks in the dashboard corner. Bump DROP_ART_V whenever these files change.
// Not for next/image: its URLs already carry Vercel's deployment id (`dpl=`), and a query on a
// local src needs images.localPatterns, which would 400 every other local image left unlisted.
export const DROP_ART_V = "2026-10-06";

export const dropArt = (path: string) => `${path}?v=${DROP_ART_V}`;
