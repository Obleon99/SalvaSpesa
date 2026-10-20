import { CompareCategoryCardView } from "./compare-category-card";
import { compareCategoryCards } from "@/lib/mock-data";

export function BentoCompareSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
      {compareCategoryCards.map((card) => (
        <CompareCategoryCardView key={card.title} card={card} />
      ))}
    </div>
  );
}
