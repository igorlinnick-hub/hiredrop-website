import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Ticker from "@/components/landing/Ticker";
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

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Ticker />
        <ProblemStats />
        <HowItWorks />
        <Features />
        <ApplyModes />
        <ChromeExtensionDemo />
        <SpeedEdge />
        <SceneStrip />
        <Pricing />
        <FAQ />
        <GradientCTA />
      </main>
      <Footer />
    </>
  );
}
