import Header from "@/components/nav/Header";
import HeroSection from "@/components/landing/HeroSection";
import OverviewSection from "@/components/landing/OverviewSection";
import WhySynodSection from "@/components/landing/WhySynodSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import { NetworkSection } from "@/components/landing/NetworkSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { Footer } from "@/components/nav/Footer";

export default function Home() {
  return (
    <div className="page-shell">
      <Header />
      <main>
        <HeroSection />
        <OverviewSection />
        <WhySynodSection />
        <HowItWorksSection />
        <NetworkSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
