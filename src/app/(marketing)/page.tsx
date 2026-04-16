import HeroSection from "@/components/landing/HeroSection";
import OverviewSection from "@/components/landing/OverviewSection";
import WhySynodSection from "@/components/landing/WhySynodSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import { NetworkSection } from "@/components/landing/NetworkSection";
import { ContactSection } from "@/components/landing/ContactSection";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <OverviewSection />
      <WhySynodSection />
      <HowItWorksSection />
      <NetworkSection />
      <ContactSection />
    </main>
  );
}
