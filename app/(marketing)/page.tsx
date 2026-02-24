
import HeroLanding from "@/components/sections/hero-landing";
import PreviewLanding from "@/components/sections/preview-landing";
import FeaturesGrid from "@/components/sections/features-grid";
import FeatureShowcase from "@/components/sections/feature-showcase";
import HowItWorks from "@/components/sections/how-it-works";
import IntegrationsPreview from "@/components/sections/integrations-preview";
import TechStack from "@/components/sections/tech-stack";
import OpenSourceCta from "@/components/sections/open-source-cta";

export default function IndexPage() {
  return (
    <>
      <HeroLanding />
      <PreviewLanding />
      <FeaturesGrid />
      <FeatureShowcase />
      <IntegrationsPreview />
      <HowItWorks />
      <TechStack />
      <OpenSourceCta />
    </>
  );
}
