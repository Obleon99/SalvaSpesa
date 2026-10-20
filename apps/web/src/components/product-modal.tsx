"use client";

import { useEffect, useState } from "react";
import { qualityLabels } from "@salvaspesa/deal-logic";
import { Icon } from "./icon";
import { Modal } from "./modal";
import { buildSparkline, expiryLabel, formatDay, formatPrice, formatShortDate, formatUnitPrice } from "@/lib/offer-search";
import type { HistoryPoint, OfferView } from "@/lib/offers-types";
import { useOfferActions } from "@/lib/use-offer-actions";

export function ProductModal({ offer, onClose }: { offer: OfferView; onClose: () => void }) {
  const actions = useOfferActions();
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ chain: offer.chainId, id: offer.externalId });
    if (offer.storeCode) params.set("store", offer.storeCode);
    fetch(`/api/offers/history?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<{ points: HistoryPoint[] }>) : { points: [] }))
      .then((data) => setHistory(data.points))
      .catch(() => undefined);
    return () => controller.abort();
  }, [offer.chainId, offer.externalId, offer.storeCode]);

  const badges = qualityLabels(offer.name, offer.description, offer.brand);
  const sparkline = history ? buildSparkline(history) : null;
  const inCart = actions.inCart(offer);
  const alert = actions.alertFor(offer);
  const rows: [string, string | null][] = [
    ["Supermercato", actions.labelOf(offer)],
    ["Formato", offer.packageText],
    ["Prezzo al kg/litro", formatUnitPrice(offer)],
    ["Valido", `fino a ${formatDay(offer.validTo)} (${expiryLabel(offer.validTo).toLowerCase()})`],
    ["Codice a barre (EAN)", offer.ean ?? null],
    ["Categoria", offer.category],
  ];

  return (
    <Modal title="Scheda prodotto" onClose={onClose}>
      <div className="flex gap-space-sm">
        <div className="w-28 h-28 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0 overflow-hidden">
          {offer.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={offer.imageUrl} alt={offer.name} className="w-full h-full object-contain" />
          ) : (
            <Icon name="image" className="text-outline text-4xl" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-title-md text-title-md text-on-surface font-bold">{offer.name}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-label-price-lg text-label-price-lg text-primary tabular-nums">{formatPrice(offer.price)}</span>
            {offer.originalPrice ? (
              <span className="font-label-unit text-label-unit text-outline line-through tabular-nums">{formatPrice(offer.originalPrice)}</span>
            ) : null}
            {offer.discountPercent ? (
              <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-unit text-label-unit font-bold">-{offer.discountPercent}%</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {[...badges, ...(offer.requiresLoyaltyCard ? ["Con carta fedeltà"] : []), ...(offer.channel === "online" ? ["Prezzo spesa online"] : [])].map((badge) => (
              <span key={badge} className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-unit text-label-unit">{badge}</span>
            ))}
          </div>
        </div>
      </div>

      {offer.description ? <p className="font-body-sm text-body-sm text-on-surface-variant">{offer.description}</p> : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-space-sm gap-y-1">
        {rows
          .filter(([, value]) => value)
          .map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="font-label-unit text-label-unit text-on-surface-variant">{name}</dt>
              <dd className="font-body-sm text-body-sm text-on-surface font-semibold break-words">{value}</dd>
            </div>
          ))}
      </dl>

      <div className="bg-surface-container-low rounded-xl p-space-sm">
        <div className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold mb-1">Andamento prezzo</div>
        {sparkline ? (
          <>
            <svg className="w-full h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 280 70" preserveAspectRatio="none">
              <path d={sparkline.line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="flex justify-between font-label-unit text-label-unit text-outline">
              <span>{formatShortDate(history![0].date)} ({formatPrice(history![0].price)})</span>
              <span className="text-primary font-bold">Oggi ({formatPrice(offer.price)})</span>
            </div>
          </>
        ) : (
          <p className="font-label-unit text-label-unit text-on-surface-variant">
            {history === null ? "Carico lo storico…" : "Storico in raccolta: il grafico comparirà dopo qualche giorno di aggiornamenti."}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-space-xs">
        <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-label-unit text-label-unit font-bold text-primary hover:underline flex items-center gap-1">
          Vedi sul sito di {offer.chainName} <Icon name="open_in_new" className="text-sm" />
        </a>
        <div className="flex gap-space-xs">
          <button
            onClick={() => actions.toggleAlert(offer)}
            aria-pressed={Boolean(alert)}
            className="px-space-sm py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-semibold flex items-center gap-1"
          >
            <Icon name={alert ? "notifications_active" : "notification_add"} className="text-base text-secondary" filled={Boolean(alert)} />
            {alert ? "Avviso attivo" : "Avvisami"}
          </button>
          <button
            onClick={() => actions.toggleCart(offer)}
            aria-pressed={inCart}
            className={`px-space-sm py-2 rounded-xl font-body-sm text-body-sm font-semibold flex items-center gap-1 ${
              inCart ? "bg-primary-fixed text-on-primary-fixed" : "bg-primary text-on-primary hover:bg-primary-container"
            }`}
          >
            <Icon name={inCart ? "check_circle" : "add_shopping_cart"} className="text-base" filled={inCart} />
            {inCart ? "Nel carrello" : "Aggiungi al carrello"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
