import { PageShell } from "@/components/page-shell";
import { PageToolbar } from "@/components/page-toolbar";
import { FilterBar } from "@/components/filter-bar";
import { InsightBanner } from "@/components/insight-banner";
import { FrolliniSection } from "@/components/frollini-section";
import { BentoCompareSection } from "@/components/bento-compare-section";
import { BrandTracker } from "@/components/brand-tracker";
import { MethodologyFooter } from "@/components/methodology-footer";

export default function HomePage() {
  return (
    <PageShell>
      <PageToolbar />
      <FilterBar />
      <InsightBanner />
      <FrolliniSection />
      <BentoCompareSection />
      <BrandTracker />
      <MethodologyFooter />
    </PageShell>
  );
}
