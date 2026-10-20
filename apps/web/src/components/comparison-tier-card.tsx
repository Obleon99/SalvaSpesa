"use client";

import { offerLabel, type ComparisonCard } from "@salvaspesa/deal-logic";
import { Icon } from "./icon";
import { formatPrice, formatUnitPrice } from "@/lib/offer-search";
import { useOfferActions } from "@/lib/use-offer-actions";
import type { CompareOffer } from "@/lib/use-comparison";

const badgeClass = {
  leader: "bg-surface-container-high text-on-surface",
  winner: "bg-primary-fixed text-on-primary-fixed",
  discount: "bg-secondary-fixed text-on-secondary-fixed",
} as const;

const priceBoxClass = { leader: "bg-surface-container-low", winner: "bg-primary-fixed/20", discount: "bg-surface-container-low" } as const;

interface Props {
  card: ComparisonCard<CompareOffer>;
  unit: "kg" | "l";
  leaderLabel: string | null;
  onOpen: (offer: CompareOffer) => void;
  onCompare: (offer: CompareOffer) => void;
  onScoring: () => void;
}

export function ComparisonTierCard({ card, unit, leaderLabel, onOpen, onCompare, onScoring }: Props) {
  const { scored } = card;
  const offer = scored.offer;
  const actions = useOfferActions();
  const isWinner = card.tier === "winner";
  const inCart = actions.inCart(offer);
  const monitored = Boolean(actions.alertFor(offer));
  const saved = actions.isSaved(offer);
  const place = actions.placeOf(offer);

  const tierBadge =
    card.tier === "leader"
      ? "Marca leader"
      : card.tier === "winner"
        ? `Risparmi il ${card.savingsPercent}%`
        : `Massimo risparmio (-${card.savingsPercent}%)`;
  const ctaLabel = isWinner && card.savingsAmount ? `Scegli & Risparmia ${formatPrice(card.savingsAmount)}` : inCart ? "Nel carrello" : "Aggiungi";

  const secondary =
    card.tier === "leader"
      ? { icon: monitored ? "notifications_active" : "notifications", title: monitored ? "Avviso attivo (tocca per togliere)" : "Monitora prezzo", onClick: () => actions.toggleAlert(offer), on: monitored }
      : card.tier === "winner"
        ? { icon: saved ? "bookmark_added" : "bookmark_add", title: saved ? "Salvato (tocca per togliere)" : "Salva tra i prodotti preferiti", onClick: () => actions.toggleSaved(offer), on: saved }
        : { icon: "compare_arrows", title: "Cerca questo prodotto nel tracker", onClick: () => onCompare(offer), on: false };

  return (
    <div
      className={`bg-surface-container-lowest rounded-2xl p-space-md flex flex-col justify-between relative transition-shadow ${
        isWinner ? "shadow-md hover:shadow-xl ring-2 ring-primary" : "shadow-sm hover:shadow-md"
      }`}
    >
      {isWinner ? (
        <div className="absolute -top-3 left-4">
          <span className="px-space-sm py-0.5 rounded-full bg-primary text-on-primary font-label-caps text-label-caps font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
            <Icon name="verified" className="text-xs" />
            Miglior scelta qualità/prezzo
          </span>
        </div>
      ) : null}

      <div className={`flex flex-col gap-space-xs ${isWinner ? "mt-1" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`px-2 py-0.5 rounded-full text-label-unit font-label-unit font-semibold ${badgeClass[card.tier]}`}>{tierBadge}</span>
          <button
            onClick={onScoring}
            title="Punteggio di convenienza: come si calcola"
            className="flex items-center gap-1 text-label-unit font-label-unit font-bold text-on-surface hover:text-primary"
          >
            <Icon name="star" className="text-amber-500 text-sm" filled />
            {scored.score.toFixed(1)} <span className="font-normal text-on-surface-variant">/ 10</span>
          </button>
        </div>

        <button onClick={() => onOpen(offer)} className="my-space-xs flex items-center justify-center p-space-xs bg-surface-container-low rounded-xl h-40" aria-label={`Apri la scheda di ${offer.name}`}>
          {offer.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="h-36 w-auto max-w-full object-contain" src={offer.imageUrl} alt={offer.name} />
          ) : (
            <Icon name="image" className="text-outline text-5xl" />
          )}
        </button>

        <div>
          <span className={`font-label-caps text-label-caps uppercase ${isWinner ? "text-primary font-bold" : "text-on-surface-variant"}`}>
            {offerLabel(scored)}
          </span>
          <h4 className="font-title-md text-title-md text-on-surface font-bold leading-snug line-clamp-2">{offer.name}</h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            {[offer.packageText, ...scored.badges].filter(Boolean).join(" • ") || "—"}
          </p>
        </div>

        <div className={`mt-2 p-space-xs rounded-xl flex items-baseline justify-between ${priceBoxClass[card.tier]}`}>
          <div className="flex flex-col">
            <span className={`font-label-caps text-[10px] uppercase ${isWinner ? "text-primary font-bold" : "text-on-surface-variant"}`}>
              {offer.chainName}
              {place ? ` • ${place}` : ""}
            </span>
            <span className={`font-label-price-lg text-label-price-lg tabular-nums ${isWinner ? "text-primary" : "text-on-surface"}`}>
              {formatPrice(offer.price)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`font-label-unit text-label-unit font-bold tabular-nums ${card.tier === "leader" ? "text-on-surface-variant font-semibold" : "text-primary"}`}>
              {formatUnitPrice({ unitPrice: scored.unitPrice, unit })}
            </span>
            {card.tier !== "leader" && leaderLabel && card.savingsPercent ? (
              <span className="font-label-unit text-[11px] text-on-surface-variant">-{card.savingsPercent}% vs {leaderLabel}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-space-sm pt-space-xs flex items-center gap-space-xs">
        <button
          onClick={() => actions.toggleCart(offer)}
          aria-pressed={inCart}
          className={`flex-1 py-2 rounded-xl font-body-sm text-body-sm font-semibold transition-colors flex items-center justify-center gap-1 ${
            isWinner
              ? inCart
                ? "bg-primary-fixed text-on-primary-fixed"
                : "bg-primary hover:bg-primary-container text-on-primary shadow-sm"
              : "bg-surface-container text-on-surface hover:bg-surface-container-high"
          }`}
        >
          <Icon name={inCart ? "check_circle" : isWinner ? "shopping_basket" : "add_shopping_cart"} className="text-base" filled={inCart} />
          <span>{ctaLabel}</span>
        </button>
        <button
          onClick={secondary.onClick}
          title={secondary.title}
          aria-pressed={secondary.on}
          className={`p-2 rounded-xl transition-colors ${isWinner || secondary.on ? "text-primary hover:bg-primary-fixed/30" : "text-outline hover:text-on-surface hover:bg-surface-container-low"}`}
        >
          <Icon name={secondary.icon} className="text-lg" filled={secondary.on} />
        </button>
      </div>
    </div>
  );
}
