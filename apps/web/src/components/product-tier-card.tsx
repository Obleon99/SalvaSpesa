import { Icon } from "./icon";
import type { TierProduct } from "@/lib/mock-data";

const badgeClassByTier: Record<TierProduct["tier"], string> = {
  leader: "bg-surface-container-high text-on-surface",
  winner: "bg-primary-fixed text-on-primary-fixed",
  discount: "bg-secondary-fixed text-on-secondary-fixed",
};

const priceBoxClassByTier: Record<TierProduct["tier"], string> = {
  leader: "bg-surface-container-low",
  winner: "bg-primary-fixed/20",
  discount: "bg-surface-container-low",
};

const secondaryActionByTier: Record<TierProduct["tier"], { icon: string; title?: string }> = {
  leader: { icon: "notifications", title: "Monitora prezzo" },
  winner: { icon: "bookmark_add", title: "Aggiungi alla lista preferiti" },
  discount: { icon: "compare_arrows" },
};

export function ProductTierCard({ product }: { product: TierProduct }) {
  const isWinner = product.tier === "winner";

  return (
    <div
      className={
        isWinner
          ? "bg-surface-container-lowest rounded-2xl p-space-md shadow-md flex flex-col justify-between hover:shadow-xl transition-shadow relative ring-2 ring-primary"
          : "bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative"
      }
    >
      {isWinner ? (
        <div className="absolute -top-3 left-4">
          <span className="px-space-sm py-0.5 rounded-full bg-primary text-on-primary font-label-caps text-label-caps font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
            <Icon name="verified" className="text-xs" />
            Miglior Scelta Qualità/Prezzo
          </span>
        </div>
      ) : null}

      <div className={`flex flex-col gap-space-xs ${isWinner ? "mt-1" : ""}`}>
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded-full text-label-unit font-label-unit font-semibold ${badgeClassByTier[product.tier]}`}>
            {product.badgeLabel}
          </span>
          <div className="flex items-center gap-1 text-label-unit font-label-unit font-bold text-on-surface">
            <Icon name="star" className="text-amber-500 text-sm" filled />
            {product.rating.toFixed(1)} <span className="font-normal text-on-surface-variant">/ 10</span>
          </div>
        </div>

        <div className="my-space-xs flex items-center justify-center p-space-xs bg-surface-container-low rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="h-36 w-auto object-contain" src={product.imageUrl} alt={product.imageAlt} />
        </div>

        <div>
          <span
            className={
              isWinner
                ? "font-label-caps text-label-caps text-primary uppercase font-bold"
                : "font-label-caps text-label-caps text-on-surface-variant uppercase"
            }
          >
            {product.brand}
          </span>
          <h4 className="font-title-md text-title-md text-on-surface font-bold leading-snug">{product.name}</h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{product.description}</p>
        </div>

        <div className={`mt-2 p-space-xs rounded-xl flex items-baseline justify-between ${priceBoxClassByTier[product.tier]}`}>
          <div className="flex flex-col">
            <span
              className={
                isWinner
                  ? "font-label-caps text-[10px] text-primary uppercase font-bold"
                  : "font-label-caps text-[10px] text-on-surface-variant uppercase"
              }
            >
              {product.priceContextLabel}
            </span>
            <span className={`font-label-price-lg text-label-price-lg tabular-nums ${isWinner ? "text-primary" : "text-on-surface"}`}>
              {product.price}
            </span>
          </div>
          {product.unitPriceDelta ? (
            <div className="flex flex-col items-end">
              <span className="font-label-unit text-label-unit font-bold text-primary tabular-nums">{product.unitPrice}</span>
              <span className="font-label-unit text-[11px] text-on-surface-variant">{product.unitPriceDelta}</span>
            </div>
          ) : (
            <span className="font-label-unit text-label-unit font-semibold text-on-surface-variant tabular-nums">
              {product.unitPrice}
            </span>
          )}
        </div>
      </div>

      <div className="mt-space-sm pt-space-xs flex items-center gap-space-xs">
        <button
          className={
            isWinner
              ? "flex-1 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm"
              : "flex-1 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-body-sm text-body-sm font-semibold transition-colors flex items-center justify-center gap-1"
          }
        >
          <Icon name={isWinner ? "shopping_basket" : "add_shopping_cart"} className="text-base" />
          <span>{product.ctaLabel}</span>
        </button>
        <button
          className={
            isWinner
              ? "p-2 rounded-xl text-primary hover:bg-primary-fixed/30 transition-colors"
              : "p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
          }
          title={secondaryActionByTier[product.tier].title}
        >
          <Icon name={secondaryActionByTier[product.tier].icon} className="text-lg" />
        </button>
      </div>
    </div>
  );
}
