import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to THIS project. Without it, a stray lockfile in the
  // home directory made Turbopack infer ~ as the root and watch the entire home folder,
  // pegging CPU + fseventsd during dev (which starved chunk serving → unstyled renders).
  // Dev-only — ignored by the production build.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
