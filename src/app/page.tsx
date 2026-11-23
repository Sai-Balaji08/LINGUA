import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import {
  AiDemo,
  Faq,
  Features,
  FinalCta,
  FreePromise,
  HowItWorks,
  Introduction,
  LanguageShowcase,
  Methodology,
  WhyLingua,
} from "@/components/landing/Sections";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <Introduction />
        <HowItWorks />
        <LanguageShowcase />
        <Methodology />
        <AiDemo />
        <Features />
        <WhyLingua />
        <FreePromise />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
