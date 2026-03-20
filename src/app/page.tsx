import Header from "@/components/nav/Header";
import HeroSection from "@/components/landing/HeroSection";
import OverviewSection from "@/components/landing/OverviewSection";
import WhySynodSection from "@/components/landing/WhySynodSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";

export default function Home() {
  return (
    <div className="page-shell">
      <Header />
      <main>
        <HeroSection />
        <OverviewSection />
        <WhySynodSection />
        <HowItWorksSection />
      </main>
    </div>
  );
}
