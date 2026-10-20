"use client";

import { Icon } from "./icon";
import { expiryLabel, daysLeft, formatPrice, formatUnitPrice } from "@/lib/offer-search";
import type { CompareOffer } from "@/lib/use-comparison";
import { useOfferActions } from "@/lib/use-offer-actions";

export function OfferCard({ offer, onOpen }: { offer: CompareOffer; onOpen: (offer: CompareOffer) => void }) {
  const actions = useOfferActions();
  const inCart = actions.inCart(offer);
  const monitored = Boolean(actions.alertFor(offer));
  const unit = formatUnitPrice(offer);

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-space-sm shadow-sm hover:shadow-md transition-shadow flex flex-col gap-space-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-unit text-label-unit font-bold truncate">{offer.chainName}</span>
        {offer.discountPercent ? (
          <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-unit text-label-unit font-bold shrink-0">-{offer.discountPercent}%</span>
        ) : null}
      </div>
      <button onClick={() => onOpen(offer)} className="h-28 flex items-center justify-center bg-surface-container-low rounded-xl" aria-label={`Apri la scheda di ${offer.name}`}>
        {offer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={offer.imageUrl} alt={offer.name} loading="lazy" className="max-h-24 max-w-full object-contain" />
        ) : (
          <Icon name="image" className="text-outline text-4xl" />
        )}
      </button>
      <div className="min-h-[2.75rem]">
        <h4 className="font-body-sm text-body-sm font-semibold text-on-surface line-clamp-2">{offer.name}</h4>
        {offer.packageText ? <p className="font-label-unit text-label-unit text-on-surface-variant truncate">{offer.packageText}</p> : null}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-label-price-sm text-label-price-sm text-primary tabular-nums">{formatPrice(offer.price)}</span>
        <div className="flex flex-col items-end">
          {offer.originalPrice ? <span className="font-label-unit text-label-unit text-outline line-through tabular-nums">{formatPrice(offer.originalPrice)}</span> : null}
          {unit ? <span className="font-label-unit text-label-unit text-on-surface-variant tabular-nums">{unit}</span> : null}
        </div>
      </div>
      <div className={`font-label-unit text-label-unit flex items-center gap-1 ${daysLeft(offer.validTo) <= 2 ? "text-error font-bold" : "text-on-surface-variant"}`}>
        <Icon name="schedule" className="text-sm" />
        {expiryLabel(offer.validTo)}
        {offer.requiresLoyaltyCard ? <span className="ml-1 text-on-surface-variant font-normal">• con carta</span> : null}
      </div>
      <div className="flex items-center gap-space-xs">
        <button
          onClick={() => actions.toggleCart(offer)}
          aria-pressed={inCart}
          className={`flex-1 py-1.5 rounded-xl font-body-sm text-body-sm font-semibold transition-colors flex items-center justify-center gap-1 ${
            inCart ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface hover:bg-surface-container-high"
          }`}
        >
          <Icon name={inCart ? "check_circle" : "add_shopping_cart"} className="text-base" filled={inCart} />
          {inCart ? "Nel carrello" : "Aggiungi"}
        </button>
        <button
          onClick={() => actions.toggleAlert(offer)}
          aria-pressed={monitored}
          title={monitored ? "Avviso attivo (tocca per togliere)" : "Monitora prezzo"}
          className={`p-1.5 rounded-xl transition-colors ${monitored ? "text-primary" : "text-outline hover:text-on-surface hover:bg-surface-container-low"}`}
        >
          <Icon name={monitored ? "notifications_active" : "notifications"} className="text-lg" filled={monitored} />
        </button>
      </div>
    </div>
  );
}
