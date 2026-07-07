import { AgentShowcase } from "@/components/landing/agent-showcase";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { ProblemStrip } from "@/components/landing/problem-strip";
import { SocialProofStrip } from "@/components/landing/social-proof-strip";
import { TrustSection } from "@/components/landing/trust-section";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main id="main-content">
        <HeroSection />
        <SocialProofStrip />
        <ProblemStrip />
        <FeatureGrid />
        <AgentShowcase />
        <TrustSection />
      </main>
      <LandingFooter />
    </div>
  );
}
