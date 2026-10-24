"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Icon } from "./icon";
import { StoreDetailDialog } from "./store-detail-dialog";
import { formatDistance, type StoreWithDistance } from "@/lib/geo";
import { useUserState } from "@/lib/user-state";

const StoresMap = dynamic(() => import("./stores-map").then((m) => m.StoresMap), {
  ssr: false,
  loading: () => <div className="w-full h-[420px] rounded-2xl bg-surface-container-low animate-pulse" />,
});

function StoreCard({ store, onOpen }: { store: StoreWithDistance; onOpen: (store: StoreWithDistance) => void }) {
  const { isFavorite, toggleFavorite } = useUserState();
  const favorite = isFavorite(store.id);

  return (
    <div
      className={`bg-surface-container-lowest rounded-2xl p-space-sm flex items-center gap-space-sm shadow-sm hover:shadow-md transition-shadow ${
        favorite ? "ring-2 ring-primary" : ""
      }`}
    >
      <button type="button" onClick={() => onOpen(store)} aria-label={`Dettagli di ${store.name}`} className="flex flex-1 min-w-0 items-center gap-space-sm text-left">
      <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center font-title-md text-title-md font-bold text-primary shrink-0">
        {store.chainName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-title-md text-title-md text-on-surface font-bold truncate">{store.name}</div>
        <div className="font-label-unit text-label-unit text-on-surface-variant truncate">
          {store.chainName}
          {store.address ? ` • ${store.address}` : ""}
        </div>
      </div>
      </button>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="font-label-unit text-label-unit font-bold text-tertiary tabular-nums">
          {formatDistance(store.distanceKm)}
        </span>
        <button
          onClick={() => toggleFavorite(store)}
          aria-pressed={favorite}
          aria-label={favorite ? `Rimuovi ${store.name} dai preferiti` : `Aggiungi ${store.name} ai preferiti`}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-label-unit text-label-unit font-bold transition-colors ${
            favorite
              ? "bg-primary text-on-primary"
              : "bg-surface-container text-on-surface hover:bg-surface-container-high"
          }`}
        >
          <Icon name="star" className="text-sm" filled={favorite} />
          {favorite ? "Preferito" : "Aggiungi"}
        </button>
      </div>
    </div>
  );
}

export function StoresView() {
  const { ready, location, radiusKm, stores, storesStatus, refreshStores, favorites, openDialog } = useUserState();
  const [chainFilter, setChainFilter] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [mode, setMode] = useState<"lista" | "mappa">("mappa");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StoreWithDistance | null>(null);

  const chains = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const store of stores) {
      const entry = counts.get(store.chainId) ?? { name: store.chainName, count: 0 };
      entry.count += 1;
      counts.set(store.chainId, entry);
    }
    return [...counts.entries()].map(([id, value]) => ({ id, ...value })).sort((a, b) => Number(a.id === "altro") - Number(b.id === "altro") || b.count - a.count);
  }, [stores]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);
  const visible = stores.filter(
    (store) => (!chainFilter || store.chainId === chainFilter) && (!onlyFavorites || favoriteIds.has(store.id)),
  );

  const selectedStore = stores.find((store) => store.id === selectedId) ?? null;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">La mia zona</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            {ready && location ? (
              <>
                Entro {radiusKm} km da <span className="font-semibold text-on-surface">{location.label}</span>. Scegli i
                tuoi preferiti: volantini, prezzi e confronti useranno quelli.
              </>
            ) : (
              "Imposta la tua posizione per trovare i supermercati nel tuo raggio."
            )}
          </p>
        </div>
        {location ? (
          <button
            onClick={() => openDialog("location")}
            className="self-start md:self-auto px-space-md py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-primary font-body-sm text-body-sm font-semibold shadow-sm transition-colors flex items-center gap-1"
          >
            <Icon name="edit_location_alt" className="text-base" />
            Cambia posizione o raggio
          </button>
        ) : null}
      </div>

      {ready && !location ? (
        <div className="bg-surface-container-low rounded-3xl p-space-xl flex flex-col items-center text-center gap-space-sm">
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
            <Icon name="location_on" className="text-3xl" />
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Dove fai di solito la spesa?</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            Con la tua posizione trovo tutti i supermercati nelle vicinanze, così puoi scegliere quelli che ti
            interessano e vedere solo le loro offerte.
          </p>
          <button
            onClick={() => openDialog("location")}
            className="px-space-md py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Icon name="my_location" className="text-base" />
            Imposta la posizione
          </button>
        </div>
      ) : null}

      {location && favorites.length > 0 ? (
        <section className="bg-surface-container-low rounded-3xl p-space-md flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-xs">
            <Icon name="star" className="text-primary text-xl" filled />
            <h2 className="font-headline-sm text-headline-sm text-on-surface">I tuoi preferiti ({favorites.length})</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-sm">
            {favorites.map((store) => (
              <StoreCard key={store.id} store={store} onOpen={setDetail} />
            ))}
          </div>
        </section>
      ) : null}

      {location ? (
        <section className="flex flex-col gap-space-sm">
          <div className="bg-surface-container-lowest p-space-sm rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <button
                onClick={() => setChainFilter(null)}
                className={`px-space-sm py-1.5 rounded-full font-body-sm text-body-sm whitespace-nowrap transition-colors ${
                  chainFilter === null
                    ? "bg-primary text-on-primary font-semibold shadow-sm"
                    : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                }`}
              >
                Tutte le insegne ({stores.length})
              </button>
              {chains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => setChainFilter(chain.id === chainFilter ? null : chain.id)}
                  className={`px-space-sm py-1.5 rounded-full font-body-sm text-body-sm whitespace-nowrap transition-colors ${
                    chainFilter === chain.id
                      ? "bg-primary text-on-primary font-semibold shadow-sm"
                      : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                  }`}
                >
                  {chain.name} ({chain.count})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-space-sm shrink-0">
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl" role="group" aria-label="Vista">
                {(["mappa", "lista"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    aria-pressed={mode === value}
                    className={`px-space-sm py-1 rounded-lg font-body-sm text-body-sm flex items-center gap-1 ${mode === value ? "bg-surface-container-lowest text-primary font-semibold shadow-sm" : "text-on-surface-variant"}`}
                  >
                    <Icon name={value === "mappa" ? "map" : "view_list"} className="text-base" />
                    {value === "mappa" ? "Mappa" : "Elenco"}
                  </button>
                ))}
              </div>
            <label className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={onlyFavorites}
                onChange={(event) => setOnlyFavorites(event.target.checked)}
                className="accent-primary w-4 h-4"
              />
              Solo preferiti
            </label>
            </div>
          </div>

          {storesStatus === "loading" ? (
            <div role="status" className="bg-surface-container-low rounded-2xl p-space-md flex items-center gap-space-sm">
              <Icon name="progress_activity" className="text-primary text-2xl animate-spin" />
              <div>
                <div className="font-title-md text-title-md text-on-surface font-bold">Cerco i supermercati…</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  La prima ricerca può richiedere fino a un minuto; poi i risultati restano salvati.
                </div>
              </div>
            </div>
          ) : null}

          {storesStatus === "error" ? (
            <div role="alert" className="bg-error-container text-on-error-container rounded-2xl p-space-md flex items-center justify-between gap-space-sm">
              <span className="font-body-md text-body-md">
                Non riesco a caricare i supermercati (il servizio mappe è sovraccarico). Riprova tra poco.
              </span>
              <button
                onClick={refreshStores}
                className="shrink-0 px-space-md py-2 rounded-xl bg-surface-container-lowest text-on-surface font-body-sm text-body-sm font-semibold shadow-sm"
              >
                Riprova
              </button>
            </div>
          ) : null}

          {storesStatus === "idle" && stores.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              Nessun supermercato trovato entro {radiusKm} km: prova ad allargare il raggio.
            </p>
          ) : null}

          {stores.length > 0 && visible.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">Nessun supermercato con questi filtri.</p>
          ) : null}

          {mode === "mappa" && location ? (
            <div className="flex flex-col gap-space-sm">
              <StoresMap stores={visible} favoriteIds={favoriteIds} center={location} radiusKm={radiusKm} selectedId={selectedId} onSelect={(store) => setSelectedId(store.id)} />
              {selectedStore ? (
                <StoreCard store={selectedStore} onOpen={setDetail} />
              ) : (
                <p className="font-label-unit text-label-unit text-on-surface-variant">
                  Tocca un punto sulla mappa per vedere il negozio e aggiungerlo ai preferiti. In verde i preferiti, in grigio gli altri.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-sm">
              {visible.map((store) => (
                <StoreCard key={store.id} store={store} onOpen={setDetail} />
              ))}
            </div>
          )}

          <p className="font-label-unit text-label-unit text-outline">
            Punti vendita: dati © contributori{" "}
            <a className="underline hover:text-primary" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap
            </a>
            . Alcuni negozi potrebbero mancare o avere l&apos;indirizzo incompleto.
          </p>
        </section>
      ) : null}
      {detail ? <StoreDetailDialog store={detail} onClose={() => setDetail(null)} /> : null}
    </>
  );
}
