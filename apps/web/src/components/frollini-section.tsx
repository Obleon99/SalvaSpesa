import { Icon } from "./icon";
import { ProductTierCard } from "./product-tier-card";
import { frolliniComparison, recommendation } from "@/lib/mock-data";

export function FrolliniSection() {
  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
        <div>
          <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider">
            Categoria Colazione • Analisi Chimico-Nutrizionale
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Biscotti Frollini al Cacao &amp; Nocciole (Formato Famiglia 700g)
          </h3>
        </div>
        <span className="font-label-unit text-label-unit text-on-surface-variant">
          Confronto aggiornato a oggi su 3 catene
        </span>
      </div>

      <div className="bg-secondary-fixed/50 text-on-secondary-fixed p-space-sm rounded-xl flex items-center justify-between gap-space-xs shadow-sm">
        <div className="flex items-center gap-space-xs">
          <Icon name="recommend" className="text-secondary text-xl" />
          <p className="font-body-sm text-body-sm">
            <strong className="font-bold">{recommendation.title}</strong> {recommendation.body}
          </p>
        </div>
        <button className="shrink-0 px-3 py-1 bg-surface-container-lowest text-on-surface text-label-unit font-label-unit font-bold rounded-lg shadow-sm hover:bg-surface-container transition-colors">
          {recommendation.ctaLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {frolliniComparison.map((product) => (
          <ProductTierCard key={product.name} product={product} />
        ))}
      </div>
    </div>
  );
}
