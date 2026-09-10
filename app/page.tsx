import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { organizationSchema, softwareApplicationSchema } from "@/lib/structured-data";

import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import ProblemStats from "@/components/landing/ProblemStats";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import ApplyModes from "@/components/landing/ApplyModes";
import ChromeExtensionDemo from "@/components/landing/ChromeExtensionDemo";
import SpeedEdge from "@/components/landing/SpeedEdge";
import SceneStrip from "@/components/landing/SceneStrip";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import GradientCTA from "@/components/landing/GradientCTA";
import Footer from "@/components/landing/Footer";

export const metadata = pageMetadata({
  title: "HireDrop — AI auto-apply for jobs, without risking your account",
  description:
    "HireDrop finds matching jobs on Indeed, ZipRecruiter and company ATS boards, writes a tailored resume and cover letter for each one, and applies from your own browser. You approve before anything sends. First 40 applications free.",
  path: "/",
});

export default function Home() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={softwareApplicationSchema()} />
      <Header />
      <main className="flex-1 landing-grid">
        <Hero />
        <SceneStrip />
        <ProblemStats />
        <HowItWorks />
        <Features />
        <ApplyModes />
        <ChromeExtensionDemo />
        <SpeedEdge />
        <Pricing />
        <FAQ />
        <GradientCTA />
      </main>
      <Footer />
    </>
  );
}
