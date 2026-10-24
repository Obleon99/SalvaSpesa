"use client";

import { flyerUrl } from "@/lib/chains";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GROUPS, classifyProduct, monthName, seasonalProduce, seasonalStatus } from "@salvaspesa/deal-logic";
import { Icon } from "./icon";
import { OfferCard } from "./offer-card";
import { ProductModal } from "./product-modal";
import { comparablePrice, expiryLabel, formatDay } from "@/lib/offer-search";
import { normalizeSearch } from "@/lib/text-search";
import { useActiveOffers, type CompareOffer } from "@/lib/use-comparison";
import { useUserState } from "@/lib/user-state";

type Sort = "sconto" | "prezzo" | "unitario" | "scadenza";

const SORTS: { id: Sort; label: string }[] = [
  { id: "sconto", label: "Maggior sconto" },
  { id: "prezzo", label: "Prezzo più basso" },
  { id: "unitario", label: "Prezzo al kg/l più basso" },
  { id: "scadenza", label: "In scadenza" },
];

const PAGE = 24;

// La stagionalità vale solo per frutta e verdura fresche, non per prodotti lavorati che ne contengono il nome.
const freshSeason = (offer: CompareOffer, month: number) =>
  classifyProduct(offer).storage === "fresco" ? seasonalStatus(offer.name, month) : null;

interface Flyer {
  key: string;
  chainId: string;
  chainName: string;
  place: string | null;
  count: number;
  from: string;
  to: string;
  sourceUrl: string;
}

export function VolantiniView() {
  const { ready, favorites, offersStatus, offerSources } = useUserState();
  const active = useActiveOffers();
  const [query, setQuery] = useState("");
  const [chain, setChain] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("sconto");
  const [shown, setShown] = useState(PAGE);
  const [opened, setOpened] = useState<CompareOffer | null>(null);

  const flyers = useMemo(() => {
    const map = new Map<string, Flyer>();
    const endDates = new Map<string, Map<string, number>>();
    for (const offer of active) {
      const key = `${offer.chainId}:${offer.storeCode ?? ""}`;
      const favorite = favorites.find((f) => offer.storeIds.includes(f.id));
      const place = favorite ? (favorite.name.trim().toLowerCase() === offer.chainName.toLowerCase() ? favorite.address : favorite.name) || null : null;
      const current = map.get(key);
      map.set(key, {
        key,
        chainId: offer.chainId,
        chainName: offer.chainName,
        place,
        count: (current?.count ?? 0) + 1,
        from: current && current.from < offer.validFrom ? current.from : offer.validFrom,
        to: offer.validTo,
        sourceUrl: current?.sourceUrl ?? flyerUrl(offer.chainId, offer.sourceUrl),
      });
      const counts = endDates.get(key) ?? new Map<string, number>();
      counts.set(offer.validTo, (counts.get(offer.validTo) ?? 0) + 1);
      endDates.set(key, counts);
    }
    // La scadenza del volantino è la data di fine condivisa dal maggior numero di offerte.
    for (const [key, flyer] of map) {
      const counts = endDates.get(key);
      if (counts) flyer.to = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    return [...map.values()].sort((a, b) => a.chainName.localeCompare(b.chainName));
  }, [active, favorites]);

  const categoryOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const offer of active) map.set(offer.id, classifyProduct(offer).group);
    return map;
  }, [active]);

  const filtered = useMemo(() => {
    const terms = normalizeSearch(query);
    const list = active.filter((offer) => {
      if (chain && offer.chainId !== chain) return false;
      if (category && categoryOf.get(offer.id) !== category) return false;
      if (terms.length === 0) return true;
      const haystack = normalizeSearch(`${offer.brand ?? ""} ${offer.name} ${offer.packageText ?? ""}`).join(" ");
      return terms.every((term) => haystack.includes(term));
    });
    const sorters: Record<Sort, (a: CompareOffer, b: CompareOffer) => number> = {
      sconto: (a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0) || a.price - b.price,
      prezzo: (a, b) => a.price - b.price,
      unitario: (a, b) => (a.unitPrice === null ? 1 : 0) - (b.unitPrice === null ? 1 : 0) || comparablePrice(a) - comparablePrice(b),
      scadenza: (a, b) => Date.parse(a.validTo) - Date.parse(b.validTo) || (b.discountPercent ?? 0) - (a.discountPercent ?? 0),
    };
    const sorted = list.sort(sorters[sort]);
    // Frutta e verdura: prima quella di stagione nel mese corrente (l'ordine scelto resta dentro ogni gruppo).
    if (category === "frutta-verdura") {
      const month = new Date().getMonth() + 1;
      const rank = (offer: CompareOffer) => {
        const season = freshSeason(offer, month);
        return season ? (season.inSeason ? 0 : 2) : 1;
      };
      return sorted.sort((a, b) => rank(a) - rank(b));
    }
    return sorted;
  }, [active, chain, category, query, sort, categoryOf]);

  const chains = [...new Map(active.map((o) => [o.chainId, o.chainName])).entries()];
  const categories = GROUPS.map((c) => ({ id: c.id as string, label: c.label })).filter((c) =>
    active.some((o) => categoryOf.get(o.id) === c.id),
  );
  const problems = offerSources.filter((s) => s.status !== "ok");

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Volantini &amp; Offerte</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Le offerte attive nei supermercati che hai scelto: {active.length.toLocaleString("it-IT")} prodotti in {flyers.length}{" "}
          {flyers.length === 1 ? "volantino" : "volantini"}.
        </p>
      </div>

      {ready && favorites.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <p className="font-body-md text-body-md text-on-surface">Scegli almeno un supermercato preferito per vedere i suoi volantini.</p>
          <Link href="/supermercati" className="shrink-0 px-space-md py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm text-center">
            Scegli i supermercati
          </Link>
        </div>
      ) : null}

      {offersStatus === "loading" ? (
        <div role="status" className="bg-surface-container-low rounded-2xl p-space-md flex items-center gap-space-sm">
          <Icon name="progress_activity" className="text-primary text-2xl animate-spin" />
          <span className="font-body-md text-body-md text-on-surface">Carico i volantini dei tuoi supermercati…</span>
        </div>
      ) : null}

      {flyers.length > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-sm" aria-label="Volantini attivi">
          {flyers.map((flyer) => (
            <div key={flyer.key} className={`bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-xs ${chain === flyer.chainId ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-start justify-between gap-space-xs">
                <div className="min-w-0">
                  <h2 className="font-title-md text-title-md font-bold text-on-surface">{flyer.chainName}</h2>
                  {flyer.place ? <p className="font-label-unit text-label-unit text-on-surface-variant truncate">{flyer.place}</p> : null}
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full font-label-caps text-label-caps font-bold ${expiryLabel(flyer.to).includes("oggi") || expiryLabel(flyer.to).includes("domani") ? "bg-error-container text-on-error-container" : "bg-surface-container text-on-surface"}`}>
                  {expiryLabel(flyer.to)}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {flyer.count.toLocaleString("it-IT")} offerte • valido fino a {formatDay(flyer.to)}
              </p>
              <div className="flex items-center gap-space-xs mt-1">
                <button
                  onClick={() => {
                    setChain(chain === flyer.chainId ? null : flyer.chainId);
                    setShown(PAGE);
                  }}
                  className="flex-1 py-1.5 rounded-xl bg-primary-fixed/40 hover:bg-primary-fixed text-on-primary-fixed font-body-sm text-body-sm font-semibold transition-colors"
                >
                  {chain === flyer.chainId ? "Mostra tutte le insegne" : "Vedi le offerte"}
                </button>
                <a href={flyer.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-low" title={`Apri il volantino di ${flyer.chainName}`}>
                  <Icon name="open_in_new" className="text-lg" />
                </a>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {problems.length > 0 && offersStatus !== "loading" ? (
        <ul className="flex flex-col gap-1">
          {[...new Set(problems.map((p) => `${p.chainName}: ${p.note ?? (p.status === "unsupported" ? "il volantino non è ancora disponibile in SpesaChiara" : "non sono riuscito a leggere le offerte")}`))].map((text) => (
            <li key={text} className="flex items-start gap-1.5 font-label-unit text-label-unit text-on-surface-variant">
              <Icon name="info" className="text-sm text-secondary shrink-0 mt-px" /> {text}
            </li>
          ))}
        </ul>
      ) : null}

      {active.length > 0 ? (
        <section className="flex flex-col gap-space-sm">
          <div className="bg-surface-container-lowest p-space-sm rounded-2xl shadow-sm flex flex-col gap-space-sm">
            <div className="flex flex-col md:flex-row gap-space-sm">
              <div className="relative flex-1">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setShown(PAGE);
                  }}
                  aria-label="Cerca nelle offerte"
                  placeholder="Cerca nelle offerte (es. yogurt, Barilla, detersivo)"
                  className="w-full bg-surface-container-low pl-10 pr-3 py-2 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <label className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface shrink-0">
                Ordina per
                <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="bg-surface-container-low px-space-sm py-2 rounded-xl font-body-sm text-body-sm">
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-space-xs">
              <button onClick={() => setChain(null)} className={`px-space-sm py-1 rounded-full font-body-sm text-body-sm ${chain === null ? "bg-primary text-on-primary font-semibold" : "bg-surface-container-low text-on-surface hover:bg-surface-container"}`}>
                Tutte le insegne
              </button>
              {chains.map(([id, name]) => (
                <button key={id} onClick={() => { setChain(chain === id ? null : id); setShown(PAGE); }} className={`px-space-sm py-1 rounded-full font-body-sm text-body-sm ${chain === id ? "bg-primary text-on-primary font-semibold" : "bg-surface-container-low text-on-surface hover:bg-surface-container"}`}>
                  {name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-space-xs">
              <button onClick={() => setCategory(null)} className={`px-space-sm py-1 rounded-full font-body-sm text-body-sm ${category === null ? "bg-tertiary text-on-tertiary font-semibold" : "bg-surface-container-low text-on-surface hover:bg-surface-container"}`}>
                Tutte le categorie
              </button>
              {categories.map((c) => (
                <button key={c.id} onClick={() => { setCategory(category === c.id ? null : c.id); setShown(PAGE); }} className={`px-space-sm py-1 rounded-full font-body-sm text-body-sm ${category === c.id ? "bg-tertiary text-on-tertiary font-semibold" : "bg-surface-container-low text-on-surface hover:bg-surface-container"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {category === "frutta-verdura" ? (
            <div className="bg-primary-fixed/40 rounded-2xl p-space-sm font-body-sm text-body-sm text-on-surface">
              <strong>Di stagione a {monthName(new Date().getMonth())}:</strong> {[...seasonalProduce(new Date().getMonth() + 1).frutta, ...seasonalProduce(new Date().getMonth() + 1).verdura].join(", ")}. I prodotti di stagione compaiono per primi.
            </div>
          ) : null}

          <p className="font-label-unit text-label-unit text-on-surface-variant" aria-live="polite">
            {filtered.length.toLocaleString("it-IT")} offerte trovate
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-space-sm">
            {filtered.slice(0, shown).map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onOpen={setOpened}
                badges={(() => {
                  const season = category === "frutta-verdura" ? freshSeason(offer, new Date().getMonth() + 1) : null;
                  return season ? (
                    <span className={`px-1.5 py-0.5 rounded-full font-label-unit text-label-unit font-bold ${season.inSeason ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface-variant"}`}>
                      {season.inSeason ? `Di stagione a ${monthName(new Date().getMonth())}` : "Fuori stagione"}
                    </span>
                  ) : undefined;
                })()}
              />
            ))}
          </div>

          {filtered.length > shown ? (
            <button onClick={() => setShown((n) => n + PAGE)} className="self-center px-space-lg py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-primary font-body-sm text-body-sm font-semibold shadow-sm">
              Mostra altre offerte ({(filtered.length - shown).toLocaleString("it-IT")})
            </button>
          ) : null}
        </section>
      ) : null}

      {opened ? <ProductModal offer={opened} onClose={() => setOpened(null)} /> : null}
    </>
  );
}
