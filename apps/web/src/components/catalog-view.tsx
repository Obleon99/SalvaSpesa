"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GROUPS, GROUP_BY_ID, STORAGE_LABEL, monthName, seasonalProduce } from "@salvaspesa/deal-logic";
import { Icon } from "./icon";
import { OfferCard } from "./offer-card";
import { ProductModal } from "./product-modal";
import type { CatalogHit, CatalogResponse } from "@/lib/catalog-server";
import { formatPrice, formatUnitPrice } from "@/lib/offer-search";
import { offerKey } from "@/lib/offers-types";
import type { CompareOffer } from "@/lib/use-comparison";
import { useUserState } from "@/lib/user-state";

type ClientHit = Omit<CatalogHit, "storeIds"> & { storeIds: string[] };

// Carne e pesce, freschi o surgelati, con un tocco solo.
const PROTEIN_PRESETS: { id: string; label: string; sub: string; storage: string }[] = [
  { id: "carne-fresca", label: "Carne fresca", sub: "carne", storage: "fresco" },
  { id: "carne-surgelata", label: "Carne surgelata", sub: "carne", storage: "surgelato" },
  { id: "pesce-fresco", label: "Pesce fresco", sub: "pesce", storage: "fresco" },
  { id: "pesce-surgelato", label: "Pesce surgelato", sub: "pesce", storage: "surgelato" },
];

const chip = (on: boolean, tone: "primary" | "tertiary" | "secondary" = "primary") =>
  `px-space-sm py-1 rounded-full font-body-sm text-body-sm whitespace-nowrap transition-colors ${
    on
      ? tone === "primary"
        ? "bg-primary text-on-primary font-semibold"
        : tone === "tertiary"
          ? "bg-tertiary text-on-tertiary font-semibold"
          : "bg-secondary text-on-secondary font-semibold"
      : "bg-surface-container-low text-on-surface hover:bg-surface-container"
  }`;

export function CatalogView() {
  const { ready, favorites, location, profile } = useUserState();
  const wantedGroups = profile.categories;
  const initial = useSearchParams().get("q") ?? "";
  const [input, setInput] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [group, setGroup] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [storage, setStorage] = useState<string | null>(null);
  const [chain, setChain] = useState<string | null>(null);
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [opened, setOpened] = useState<CompareOffer | null>(null);

  useEffect(() => {
    if (initial && initial !== query) {
      setInput(initial);
      setQuery(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);

  const stores = useMemo(
    () => favorites.map((s) => ({ id: s.id, name: s.name, chainId: s.chainId, chainName: s.chainName, lat: s.lat, lng: s.lng })),
    [favorites],
  );
  const storesKey = stores.map((s) => s.id).sort().join("|");

  useEffect(() => {
    if (!ready || stores.length === 0 || (query.length < 2 && !group)) {
      setData(null);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stores, q: query, group: group ?? "", groups: wantedGroups, sub: sub ?? "", storage: storage ?? "", chain: chain ?? "" }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<CatalogResponse>;
      })
      .then((result) => {
        setData(result);
        setStatus("idle");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, storesKey, query, group, sub, storage, chain, wantedGroups.join(",")]);

  const month = data?.month ?? new Date().getMonth() + 1;
  const monthLabel = monthName(month - 1);
  const produce = useMemo(() => seasonalProduce(month), [month]);

  const pickGroup = (id: string | null) => {
    setGroup(id === group ? null : id);
    setSub(null);
    setStorage(null);
  };

  const hits = (data?.hits ?? []) as ClientHit[];
  const seasonal = group === "frutta-verdura" ? hits.filter((hit) => hit.season?.inSeason) : [];
  const others = group === "frutta-verdura" ? hits.filter((hit) => !hit.season?.inSeason) : hits;
  // Il più conveniente si confronta solo tra prodotti con la stessa unità (kg, l o pezzo), quella più frequente.
  const best = useMemo(() => {
    const priced = hits.filter((hit) => hit.unitPrice !== null && hit.unit);
    const counts = new Map<string, number>();
    for (const hit of priced) counts.set(hit.unit as string, (counts.get(hit.unit as string) ?? 0) + 1);
    const unit = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const pool = priced.filter((hit) => hit.unit === unit);
    const inSeason = pool.filter((hit) => hit.season?.inSeason);
    return [...(inSeason.length > 0 ? inSeason : pool)].sort((a, b) => (a.unitPrice as number) - (b.unitPrice as number))[0] ?? hits[0];
  }, [hits]);
  const toCompare = (hit: ClientHit): CompareOffer => ({ ...hit, id: offerKey(hit) });

  const renderCard = (hit: ClientHit) => {
    const badges = (
      <>
        {hit.kind === "offerta" ? <span className="px-1.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-unit text-label-unit font-bold">In offerta</span> : null}
        {hit.season ? (
          <span className={`px-1.5 py-0.5 rounded-full font-label-unit text-label-unit font-bold ${hit.season.inSeason ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface-variant"}`}>
            {hit.season.inSeason ? `Di stagione a ${monthLabel}` : "Fuori stagione"}
          </span>
        ) : null}
        {hit.storage ? <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-unit text-label-unit">{STORAGE_LABEL[hit.storage]}</span> : null}
      </>
    );
    return <OfferCard key={offerKey(hit)} offer={toCompare(hit)} onOpen={setOpened} catalog={hit.kind === "catalogo"} badges={badges} />;
  };

  const groupDef = group ? GROUP_BY_ID.get(group as never) : null;
  const subs = groupDef?.subs.filter((s) => (data?.subs[s.id] ?? 0) > 0) ?? [];
  const storages = Object.entries(data?.storages ?? {});
  const chainsInResults = Object.entries(data?.chains ?? {});
  const protein = group === "proteine";
  const activePreset = protein ? PROTEIN_PRESETS.find((p) => p.sub === sub && p.storage === storage)?.id : undefined;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Cerca Prodotti</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Cerca in tutti i prodotti dei supermercati preferiti: offerte del volantino e listini completi, ordinati per prezzo al kg o al litro.
        </p>
      </div>

      {ready && favorites.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <p className="font-body-md text-body-md text-on-surface">
            {location ? "Scegli almeno un supermercato preferito per cercare nei suoi prodotti." : "Imposta la posizione e scegli i supermercati preferiti per cercare nei loro prodotti."}
          </p>
          <Link href="/supermercati" className="shrink-0 px-space-md py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm text-center">
            Scegli i supermercati
          </Link>
        </div>
      ) : null}

      <div className="bg-surface-container-lowest p-space-sm rounded-2xl shadow-sm flex flex-col gap-space-sm">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg pointer-events-none" />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-label="Cerca nel catalogo"
            placeholder="Cerca un prodotto o una marca (es. petto di pollo, Barilla, yogurt greco)"
            className="w-full bg-surface-container-low pl-10 pr-3 py-2 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
            type="search"
          />
        </div>

        <div className="flex flex-wrap gap-space-xs" role="group" aria-label="Categorie">
          {GROUPS.filter((g) => g.id !== "altro" && (wantedGroups.length === 0 || wantedGroups.includes(g.id))).map((g) => (
            <button key={g.id} onClick={() => pickGroup(g.id)} aria-pressed={group === g.id} className={`${chip(group === g.id, "tertiary")} inline-flex items-center gap-1`}>
              <Icon name={g.icon} className="text-base" />
              {g.label}
              {data && query ? <span className="opacity-70">({data.groups[g.id] ?? 0})</span> : null}
            </button>
          ))}
        </div>

        {protein ? (
          <div className="flex flex-wrap items-center gap-space-xs" role="group" aria-label="Carne e pesce">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Carne e pesce:</span>
            {PROTEIN_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  const on = activePreset === preset.id;
                  setSub(on ? null : preset.sub);
                  setStorage(on ? null : preset.storage);
                }}
                aria-pressed={activePreset === preset.id}
                className={chip(activePreset === preset.id, "secondary")}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : null}

        {subs.length > 0 ? (
          <div className="flex flex-wrap gap-space-xs" role="group" aria-label="Sottocategorie">
            {subs.map((s) => (
              <button key={s.id} onClick={() => setSub(sub === s.id ? null : s.id)} aria-pressed={sub === s.id} className={chip(sub === s.id)}>
                {s.label} <span className="opacity-70">({data?.subs[s.id] ?? 0})</span>
              </button>
            ))}
          </div>
        ) : null}

        {(protein || group === "frutta-verdura") && storages.length > 0 ? (
          <div className="flex flex-wrap items-center gap-space-xs" role="group" aria-label="Conservazione">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Conservazione:</span>
            <button onClick={() => setStorage(null)} className={chip(storage === null, "secondary")}>Tutti</button>
            {storages.map(([id, count]) => (
              <button key={id} onClick={() => setStorage(storage === id ? null : id)} aria-pressed={storage === id} className={chip(storage === id, "secondary")}>
                {STORAGE_LABEL[id as keyof typeof STORAGE_LABEL] ?? id} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        ) : null}

        {chainsInResults.length > 1 ? (
          <div className="flex flex-wrap items-center gap-space-xs" role="group" aria-label="Insegne">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Insegne:</span>
            <button onClick={() => setChain(null)} className={chip(chain === null)}>Tutte</button>
            {chainsInResults.map(([id, count]) => (
              <button key={id} onClick={() => setChain(chain === id ? null : id)} aria-pressed={chain === id} className={chip(chain === id)}>
                {data?.sources.find((s) => s.chainId === id)?.chainName ?? id} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {group === "frutta-verdura" ? (
        <div className="bg-primary-fixed/40 rounded-2xl p-space-md flex flex-col gap-1">
          <h2 className="font-title-md text-title-md font-bold text-on-primary-fixed flex items-center gap-1">
            <Icon name="eco" className="text-xl" /> Di stagione a {monthLabel}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface">
            <strong>Frutta:</strong> {produce.frutta.join(", ") || "—"}. <strong>Verdura:</strong> {produce.verdura.join(", ") || "—"}.
          </p>
          <p className="font-label-unit text-label-unit text-on-surface-variant">Qui sotto trovi prima i prodotti di stagione, di solito più freschi e convenienti.</p>
        </div>
      ) : null}

      {status === "loading" ? (
        <div role="status" className="bg-surface-container-low rounded-2xl p-space-md flex items-center gap-space-sm">
          <Icon name="progress_activity" className="text-primary text-2xl animate-spin" />
          <span className="font-body-md text-body-md text-on-surface">Cerco nei prodotti dei tuoi supermercati… la prima volta può servire qualche minuto per scaricare i listini.</span>
        </div>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-error font-body-md text-body-md">Non sono riuscito a cercare nel catalogo, riprova tra poco.</p>
      ) : null}

      {data && status !== "loading" ? (
        <>
          <div className="flex flex-col gap-1" aria-live="polite">
            <p className="font-label-unit text-label-unit text-on-surface-variant">
              {data.total.toLocaleString("it-IT")} prodotti trovati{data.total > data.hits.length ? ` (mostro i primi ${data.hits.length})` : ""}
            </p>
            {best ? (
              <p className="font-body-sm text-body-sm text-on-surface flex items-start gap-1">
                <Icon name="emoji_events" className="text-base text-secondary shrink-0 mt-0.5" />
                <span>
                  Il più conveniente al {best.unit ?? "pezzo"}: <strong>{best.name}</strong> da {best.chainName} a {formatUnitPrice(best) ?? formatPrice(best.price)}.
                </span>
              </p>
            ) : null}
          </div>

          {seasonal.length > 0 ? (
            <section className="flex flex-col gap-space-sm" aria-label={`Di stagione a ${monthLabel}`}>
              <h2 className="font-title-md text-title-md font-bold text-on-surface">Di stagione a {monthLabel} ({seasonal.length})</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-space-sm">{seasonal.map(renderCard)}</div>
            </section>
          ) : null}

          {others.length > 0 ? (
            <section className="flex flex-col gap-space-sm" aria-label="Risultati">
              {seasonal.length > 0 ? <h2 className="font-title-md text-title-md font-bold text-on-surface">Altri prodotti ({others.length})</h2> : null}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-space-sm">{others.map(renderCard)}</div>
            </section>
          ) : null}

          {data.total === 0 ? <p className="font-body-md text-body-md text-on-surface-variant">Nessun prodotto trovato nei tuoi supermercati.</p> : null}

          <ul className="flex flex-col gap-1" aria-label="Fonti dei dati">
            {data.sources.map((source) => (
              <li key={source.chainId} className="flex items-start gap-1.5 font-label-unit text-label-unit text-on-surface-variant">
                <Icon name={source.status === "ok" ? "check_circle" : "info"} className={`text-sm shrink-0 mt-px ${source.status === "ok" ? "text-primary" : "text-secondary"}`} />
                {source.status === "ok"
                  ? `${source.chainName}: ${source.products.toLocaleString("it-IT")} prodotti a listino${source.scrapedAt ? `, aggiornati il ${new Date(source.scrapedAt).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}` : ""}`
                  : `${source.chainName}: ${source.note ?? "non disponibile"}`}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {!data && status === "idle" && stores.length > 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">Scrivi un prodotto o scegli una categoria per iniziare.</p>
      ) : null}

      {opened ? <ProductModal offer={opened} onClose={() => setOpened(null)} /> : null}
    </>
  );
}
