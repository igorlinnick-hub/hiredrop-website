import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AttributionCapture from "@/components/AttributionCapture";
import AdPixels from "@/components/AdPixels";
import { display, sans, serif } from "@/lib/fonts";
import "./globals.css";

// Meta Business domain verification (Business Settings → Brand safety →
// Domains). Emitted only when set, like every other ad setting.
const META_DOMAIN_VERIFICATION = (process.env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION ?? "").trim();

export const metadata: Metadata = {
  metadataBase: new URL("https://hiredrop.io"),
  title: "HireDrop — Automate Your Job Search",
  description: "AI-powered job search automation. Personalized cover letters, auto-apply, multi-platform search.",
  openGraph: {
    type: "website",
    siteName: "HireDrop",
    url: "https://hiredrop.io",
    title: "HireDrop — Automate Your Job Search",
    description: "AI-powered job search automation. Personalized cover letters, auto-apply, multi-platform search.",
  },
  // Google Search Console ownership. Issued by the siteVerification API for
  // https://hiredrop.io/ — `python jobflow/scripts/gsc.py token` reissues it.
  // Removing this un-verifies the property and blanks the search-query data.
  verification: {
    google: "0R9KfhdGASPU2RI189FBNtRY3vI9l2unld0XB9Ncebo",
  },
  ...(META_DOMAIN_VERIFICATION
    ? { other: { "facebook-domain-verification": META_DOMAIN_VERIFICATION } }
    : {}),
  twitter: {
    card: "summary_large_image",
    title: "HireDrop — Automate Your Job Search",
    description: "AI-powered job search automation. Personalized cover letters, auto-apply, multi-platform search.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${sans.variable} ${display.variable} ${serif.variable}`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AttributionCapture />
        {/* Inert unless NEXT_PUBLIC_META_PIXEL_ID / NEXT_PUBLIC_GOOGLE_ADS_ID are set. */}
        <AdPixels />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
