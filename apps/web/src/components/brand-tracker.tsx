"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AmazonResults } from "./amazon-results";
import { Icon } from "./icon";
import {
  bestPerChain,
  buildSparkline,
  expiryLabel,
  formatDay,
  formatPrice,
  formatShortDate,
  formatUnitPrice,
  daysLeft,
  rankOffers,
  searchOffers,
  suggestedAlertThreshold,
} from "@/lib/offer-search";
import { offerKey, type HistoryPoint, type OfferView, type SourceInfo } from "@/lib/offers-types";
import { useUserState } from "@/lib/user-state";

const FREQUENT_BRANDS = ["Barilla", "De Cecco", "Nutella", "Coca-Cola", "Pampers"];

function sourceProblems(sources: SourceInfo[]): string[] {
  const problems = new Map<string, string>();
  for (const source of sources) {
    if (source.status === "ok") continue;
    const reason =
      source.note ??
      (source.status === "unsupported"
        ? "il volantino non è ancora disponibile in SpesaChiara"
        : source.status === "stale"
          ? "dati non aggiornati"
          : "non sono riuscito a leggere le offerte");
    problems.set(`${source.chainName}|${reason}`, `${source.chainName}: ${reason}`);
  }
  return [...problems.values()];
}

export function BrandTracker() {
  const { ready, favorites, offers, offersStatus, offerSources, offersGeneratedAt, refreshOffers, cart, toggleCartItem, alerts, setAlert, removeAlert } =
    useUserState();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const urlQuery = useSearchParams().get("q");

  useEffect(() => {
    if (!urlQuery) return;
    setInput(urlQuery);
    setQuery(urlQuery.trim());
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [urlQuery]);

  const results = useMemo(() => rankOffers(searchOffers(offers, query)), [offers, query]);
  const best = results[0] ?? null;
  const others = useMemo(() => bestPerChain(results).filter((o) => o.chainId !== best?.chainId).slice(0, 6), [results, best]);

  // Indirizzo o nome del negozio preferito, solo se dice qualcosa in più del nome della catena.
  const storePlace = (offer: OfferView): string | null => {
    const favorite = favorites.find((f) => offer.storeIds.includes(f.id));
    if (!favorite) return null;
    const sameAsChain = favorite.name.trim().toLowerCase() === offer.chainName.toLowerCase();
    return (sameAsChain ? favorite.address : favorite.name) || null;
  };
  const withPlace = (offer: OfferView) => {
    const place = storePlace(offer);
    return place ? `${offer.chainName} • ${place}` : offer.chainName;
  };
  const bestKey = best ? offerKey(best) : null;

  useEffect(() => {
    setShowAll(false);
    setHistory(null);
    if (!best) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ chain: best.chainId, id: best.externalId });
    if (best.storeCode) params.set("store", best.storeCode);
    fetch(`/api/offers/history?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<{ points: HistoryPoint[] }>) : { points: [] }))
      .then((data) => setHistory(data.points))
      .catch(() => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestKey]);

  function search(value: string) {
    setInput(value);
    setQuery(value.trim());
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    search(input);
  }

  const inCart = bestKey ? cart.some((c) => c.key === bestKey) : false;
  const alert = bestKey ? alerts.find((a) => a.key === bestKey) : undefined;
  const sparkline = history ? buildSparkline(history) : null;
  const firstPoint = history?.[0];
  const trend = history && history.length >= 2 && firstPoint && best && firstPoint.price > 0 ? Math.round(((best.price - firstPoint.price) / firstPoint.price) * 100) : null;
  const problems = sourceProblems(offerSources);
  const updatedAt = offersGeneratedAt ? new Date(offersGeneratedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div id="tracker" ref={rootRef} className="scroll-mt-28 bg-surface-container-lowest rounded-3xl p-space-md md:p-space-xl shadow-md flex flex-col gap-space-md">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
        <div>
          <span className="font-label-caps text-label-caps text-secondary uppercase font-bold tracking-wider">
            Tracker Dinamico Volantini
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Trova il Miglior Prezzo per la Tua Marca Preferita
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {favorites.length > 0
              ? `Digita il marchio che non vuoi sostituire: confrontiamo le offerte attive nei ${favorites.length} supermercati che hai scelto${updatedAt ? ` (aggiornate alle ${updatedAt})` : ""}.`
              : "Digita il marchio che non vuoi sostituire: confrontiamo le offerte attive nei supermercati preferiti."}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-label-unit text-label-unit text-outline">Frequenti:</span>
          {FREQUENT_BRANDS.map((brand) => (
            <button
              key={brand}
              className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-label-unit text-label-unit font-bold hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors"
              onClick={() => search(brand)}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="relative w-full">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-2xl" />
        <input
          className="w-full bg-surface-container-low pl-12 pr-32 py-3.5 rounded-2xl font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
          placeholder="es. Pasta De Cecco spaghetti 500g"
          aria-label="Prodotto o marca da cercare"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button
          type="submit"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold px-space-md py-2 rounded-xl transition-all shadow-sm"
        >
          Cerca Offerte
        </button>
      </form>

      {ready && favorites.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <Icon name="storefront" className="text-primary text-3xl" />
            <p className="font-body-md text-body-md text-on-surface">
              Scegli almeno un supermercato preferito: cercherò i prezzi nei loro volantini.
            </p>
          </div>
          <Link
            href="/supermercati"
            className="shrink-0 px-space-md py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm transition-colors text-center"
          >
            Scegli i supermercati
          </Link>
        </div>
      ) : null}

      {offersStatus === "loading" ? (
        <div role="status" className="bg-surface-container-low rounded-2xl p-space-md flex items-center gap-space-sm">
          <Icon name="progress_activity" className="text-primary text-2xl animate-spin" />
          <div>
            <div className="font-title-md text-title-md text-on-surface font-bold">Carico le offerte dei tuoi supermercati…</div>
            <div className="font-body-sm text-body-sm text-on-surface-variant">
              Se i volantini non sono aggiornati li scarico ora: può servire fino a mezzo minuto per negozio.
            </div>
          </div>
        </div>
      ) : null}

      {offersStatus === "error" ? (
        <div role="alert" className="bg-error-container text-on-error-container rounded-2xl p-space-md flex items-center justify-between gap-space-sm">
          <span className="font-body-md text-body-md">Non riesco a leggere le offerte in questo momento.</span>
          <button onClick={refreshOffers} className="shrink-0 px-space-md py-2 rounded-xl bg-surface-container-lowest text-on-surface font-body-sm text-body-sm font-semibold shadow-sm">
            Riprova
          </button>
        </div>
      ) : null}

      {problems.length > 0 && offersStatus !== "loading" ? (
        <ul className="flex flex-col gap-1">
          {problems.map((problem) => (
            <li key={problem} className="flex items-start gap-1.5 font-label-unit text-label-unit text-on-surface-variant">
              <Icon name="info" className="text-sm text-secondary shrink-0 mt-px" />
              {problem}
            </li>
          ))}
        </ul>
      ) : null}

      {query && offersStatus === "idle" && favorites.length > 0 && !best ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Nessuna offerta attiva per «{query}» nei volantini dei tuoi supermercati. Prova con una parola sola (es. solo la marca).
        </p>
      ) : null}

      {!query && offersStatus === "idle" && favorites.length > 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          {offers.length.toLocaleString("it-IT")} offerte attive nei tuoi supermercati. Cerca un prodotto per vedere dove costa meno.
        </p>
      ) : null}

      {best ? (
        <div className="bg-surface-container-low rounded-2xl p-space-md flex flex-col lg:flex-row items-stretch justify-between gap-space-lg">
          <div className="flex-1 flex flex-col justify-between gap-space-sm min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-space-xs">
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-primary text-on-primary font-label-unit text-label-unit font-bold">
                  MIGLIOR PREZZO ORA
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  In volantino fino a {formatDay(best.validTo)}
                </span>
              </div>
              <span
                className={`font-label-caps text-label-caps font-bold flex items-center gap-1 ${
                  daysLeft(best.validTo) <= 2 ? "text-error" : "text-on-surface-variant"
                }`}
              >
                <Icon name="alarm" className="text-sm" /> {expiryLabel(best.validTo)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest p-space-sm rounded-xl shadow-sm">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center shrink-0 overflow-hidden">
                  {best.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={best.imageUrl} alt={best.name} className="w-full h-full object-contain" />
                  ) : (
                    <Icon name="storefront" />
                  )}
                </div>
                <div className="min-w-0">
                  <h5 className="font-title-md text-title-md font-bold text-on-surface truncate">
                    {withPlace(best)}
                  </h5>
                  <p className="font-body-sm text-body-sm text-on-surface line-clamp-2">{best.name}</p>
                  <p className="font-label-unit text-label-unit text-on-surface-variant">
                    {[
                      best.packageText,
                      best.discountPercent ? `Sconto -${best.discountPercent}%` : null,
                      best.requiresLoyaltyCard ? "Con carta fedeltà" : null,
                      best.channel === "online" ? "Prezzo spesa online" : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>
              </div>
              <div className="flex items-baseline sm:flex-col sm:items-end justify-between gap-2 shrink-0">
                <span className="font-label-price-lg text-label-price-lg text-primary tabular-nums">{formatPrice(best.price)}</span>
                <div className="flex flex-col items-end">
                  {best.originalPrice ? (
                    <span className="font-label-unit text-label-unit text-outline line-through tabular-nums">{formatPrice(best.originalPrice)}</span>
                  ) : null}
                  {formatUnitPrice(best) ? (
                    <span className="font-label-unit text-label-unit text-on-surface-variant tabular-nums">{formatUnitPrice(best)}</span>
                  ) : null}
                </div>
              </div>
            </div>

            {others.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {others.map((offer, index) => (
                  <div key={offer.chainId} className="p-2 rounded-xl bg-surface-container-lowest text-center" title={offer.name}>
                    <span className="font-label-unit text-label-unit text-on-surface-variant block truncate">
                      {withPlace(offer)}
                    </span>
                    <span
                      className={`font-title-md text-title-md font-bold tabular-nums ${
                        others.length >= 2 && index === others.length - 1 ? "text-error" : "text-on-surface"
                      }`}
                    >
                      {formatPrice(offer.price)}
                    </span>
                    {formatUnitPrice(offer) ? (
                      <span className="font-label-unit text-label-unit text-on-surface-variant block tabular-nums">{formatUnitPrice(offer)}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-label-unit text-label-unit text-on-surface-variant">
                Nessun altro dei tuoi supermercati ha questo prodotto in offerta.
              </p>
            )}

            {results.length > 1 ? (
              <div>
                <button
                  onClick={() => setShowAll((value) => !value)}
                  className="font-label-unit text-label-unit font-bold text-primary hover:underline"
                >
                  {showAll ? "Nascondi" : `Vedi tutte le ${results.length} offerte trovate`}
                </button>
                {showAll ? (
                  <ul className="mt-space-xs flex flex-col gap-1 max-h-72 overflow-y-auto">
                    {results.slice(0, 40).map((offer) => (
                      <li key={offerKey(offer)} className="flex items-center justify-between gap-space-sm bg-surface-container-lowest px-space-sm py-1.5 rounded-lg">
                        <span className="font-body-sm text-body-sm text-on-surface truncate">
                          <span className="font-bold">{offer.chainName}</span> · {offer.name}
                        </span>
                        <span className="font-label-unit text-label-unit font-bold text-on-surface tabular-nums shrink-0">
                          {formatPrice(offer.price)}
                          {formatUnitPrice(offer) ? ` · ${formatUnitPrice(offer)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="w-full lg:w-80 flex flex-col justify-between gap-space-xs bg-surface-container-lowest p-space-sm rounded-2xl shadow-sm shrink-0">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">Andamento prezzo</span>
                {trend !== null ? (
                  <span className={`font-label-unit text-label-unit font-bold flex items-center ${trend <= 0 ? "text-primary" : "text-error"}`}>
                    <Icon name={trend <= 0 ? "trending_down" : "trending_up"} className="text-xs" /> {trend > 0 ? "+" : ""}
                    {trend}%
                  </span>
                ) : null}
              </div>
              {sparkline ? (
                <>
                  <div className="w-full h-20 my-2">
                    <svg className="w-full h-full text-primary" fill="none" stroke="currentColor" viewBox="0 0 280 70" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="sparkGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={sparkline.fill} fill="url(#sparkGradient)" stroke="none" />
                      <path d={sparkline.line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-label-unit font-label-unit text-outline">
                    <span>
                      {formatShortDate(history![0].date)} ({formatPrice(history![0].price)})
                    </span>
                    <span className="text-primary font-bold">Oggi ({formatPrice(best.price)})</span>
                  </div>
                </>
              ) : (
                <div className="my-2 h-20 flex items-center justify-center text-center bg-surface-container-low rounded-xl px-space-sm">
                  <span className="font-label-unit text-label-unit text-on-surface-variant">
                    {history === null
                      ? "Carico lo storico…"
                      : "Storico in raccolta: il grafico comparirà dopo qualche giorno di aggiornamenti dei volantini."}
                  </span>
                </div>
              )}
              {best.originalPrice ? (
                <p className="font-label-unit text-label-unit text-on-surface-variant">
                  Prezzo normale indicato dal volantino: {formatPrice(best.originalPrice)}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() =>
                  bestKey &&
                  toggleCartItem({
                    key: bestKey,
                    chainId: best.chainId,
                    chainName: best.chainName,
                    storeName: storePlace(best) ?? best.chainName,
                    name: best.name,
                    price: best.price,
                    unitPrice: best.unitPrice,
                    unit: best.unit,
                    imageUrl: best.imageUrl,
                  })
                }
                aria-pressed={inCart}
                className={`w-full py-2.5 rounded-xl font-body-sm text-body-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                  inCart ? "bg-primary-fixed text-on-primary-fixed" : "bg-primary hover:bg-primary-container text-on-primary"
                }`}
              >
                <Icon name={inCart ? "check_circle" : "shopping_cart_checkout"} className="text-base" filled={inCart} />
                <span>{inCart ? "Nel Carrello Smart" : "Blocca al Carrello Smart"}</span>
              </button>
              <button
                onClick={() => {
                  if (!bestKey) return;
                  if (alert) removeAlert(bestKey);
                  else setAlert({ key: bestKey, name: best.name, chainName: best.chainName, threshold: suggestedAlertThreshold(best.price) });
                }}
                aria-pressed={Boolean(alert)}
                className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Icon name={alert ? "notifications_active" : "notification_add"} className="text-base text-secondary" filled={Boolean(alert)} />
                <span>
                  {alert
                    ? `Avviso attivo sotto ${formatPrice(alert.threshold)} (tocca per togliere)`
                    : `Avviso quando scende sotto ${formatPrice(suggestedAlertThreshold(best.price))}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AmazonResults query={query} />
    </div>
  );
}
