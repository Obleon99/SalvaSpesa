import { detectMultibuy } from "@salvaspesa/deal-logic";
import { adapters, scraperConfig, sha1Hex } from "@salvaspesa/scraper-core";
import type { ScrapedOffer } from "@salvaspesa/shared-types";
import type { FavoriteRef, OfferView, OffersResponse, SourceInfo } from "./offers-types";
import { RESOLVERS, type Resolution } from "./resolvers";

// Dove si salvano gli snapshot delle offerte: sul telefono sono file, nei test una mappa in memoria.
export interface SnapshotStorage {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  // Facoltativi: servono a tenere sotto controllo lo spazio occupato.
  list?(): Promise<{ key: string; size: number }[]>;
  remove?(key: string): Promise<void>;
}

interface Snapshot {
  // Ultimo scaricamento completo.
  scrapedAt: string;
  // Ultima verifica che il volantino fosse ancora lo stesso (senza riscaricarlo).
  checkedAt?: string;
  fingerprint?: string;
  offers: ScrapedOffer[];
}

export const CHAIN_NAMES: Record<string, string> = {
  lidl: "Lidl",
  penny: "Penny",
  eurospin: "Eurospin",
  esselunga: "Esselunga",
  tigros: "Tigros",
  ekom: "Ekom",
  aldi: "Aldi",
  conad: "Conad",
  coop: "Coop",
};

// Pagine leggere che cambiano quando esce un nuovo volantino: se l'impronta è identica si evita di riscaricare tutto.
const PROBES: Record<string, string[]> = {
  lidl: ["https://www.lidl.it/c/volantino-lidl/s10018048"],
  penny: ["https://www.penny.it/offerte"],
  ekom: ["https://www.ekomdiscount.it/ebsn/api/leaflet/search?parent_leaflet_type_id=1"],
  aldi: ["https://www.aldi.it/prodotti"],
  eurospin: [
    "https://www.eurospin.com/content/eurospin/it/it/home/products/jcr:content/root/container/productlisting.model.json?q=&page=1&size=5&by_typeOffer=offerta&by_typeOffer=family&by_typeOffer=limitati&by_typeOffer=ribassati",
  ],
  tigros: ["https://www.tigros.it/ebsn/api/products?promo=true&page=1&page_size=5&hash=w0d0t0"],
};
const PROBE_USER_AGENT = "Mozilla/5.0 (compatible; SpesaChiaraBot/0.1; progetto personale di confronto prezzi)";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_AGE_MS = 6 * HOUR_MS;
// Anche se l'impronta non cambia, dopo questo tempo si riscarica comunque (protezione contro pagine "statiche").
const PROBE_MAX_AGE_MS = 3 * DAY_MS;
const RESOLUTION_TTL_MS = 30 * DAY_MS;
// Un aggiornamento manuale non riscarica comunque prima di questo tempo (più lungo per le insegne senza controllo leggero).
const FORCE_MIN_PROBED_MS = 10 * 60 * 1000;
const FORCE_MIN_BLIND_MS = 3 * HOUR_MS;
// Al massimo due insegne scaricano e analizzano insieme: l'analisi pesa sul processore e l'app deve restare fluida.
const MAX_PARALLEL_SCRAPES = 2;
const EXPIRED_KEEP_MS = 3 * DAY_MS;
// Spazio massimo occupato dagli snapshot sul telefono.
export const STORAGE_BUDGET_BYTES = 8 * 1024 * 1024;
const ORPHAN_MAX_AGE_MS = 14 * DAY_MS;
const MAX_DESCRIPTION = 120;

const verifiedAt = (snapshot: Snapshot) => Date.parse(snapshot.checkedAt ?? snapshot.scrapedAt);
const isFresh = (snapshot: Snapshot | null, maxAgeMs: number) => snapshot !== null && Date.now() - verifiedAt(snapshot) < maxAgeMs;
const keyOf = (chainId: string, code: string) => `offers-${chainId}-${code || "all"}`;

async function readSnapshot(storage: SnapshotStorage, chainId: string, code: string): Promise<Snapshot | null> {
  try {
    const raw = await storage.read(keyOf(chainId, code));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

async function fingerprintOf(chainId: string): Promise<string | null> {
  const urls = PROBES[chainId];
  if (!urls) return null;
  try {
    const texts = await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(url, { headers: { "User-Agent": PROBE_USER_AGENT, "Accept-Language": "it-IT,it;q=0.9" }, signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      }),
    );
    return sha1Hex(texts.join("\n"));
  } catch {
    return null;
  }
}

// Esegue lo scraper della catena sul telefono e salva uno snapshot per ogni codice negozio. Restituisce un messaggio d'errore oppure null.
async function scrapeChain(storage: SnapshotStorage, chainId: string, codes: string[], fingerprint: string | null): Promise<string | null> {
  const adapter = adapters.find((a) => a.chainId === chainId);
  if (!adapter) return "insegna non gestita";
  if (chainId === "esselunga" && codes.length > 0) scraperConfig.esselungaStores = codes;
  if (chainId === "coop") scraperConfig.coopStores = codes;
  try {
    const result = await adapter.scrape();
    if (result.offers.length === 0) return result.rejected[0]?.reason ?? "nessuna offerta letta";
    const scrapedAt = new Date().toISOString();
    const groups = new Map<string, ScrapedOffer[]>();
    for (const offer of result.offers) {
      const compact = offer.description && offer.description.length > MAX_DESCRIPTION ? { ...offer, description: `${offer.description.slice(0, MAX_DESCRIPTION)}…` } : offer;
      groups.set(offer.storeCode ?? "", [...(groups.get(offer.storeCode ?? "") ?? []), compact]);
    }
    for (const [code, offers] of groups) {
      const snapshot: Snapshot = { scrapedAt, checkedAt: scrapedAt, offers, ...(fingerprint ? { fingerprint } : {}) };
      await storage.write(keyOf(chainId, code), JSON.stringify(snapshot));
    }
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

// Il codice del volantino di un negozio non cambia: si ricorda per un mese invece di richiederlo ogni volta.
async function resolveCached(storage: SnapshotStorage, chainId: string, favorite: FavoriteRef, networkAllowed: boolean): Promise<Resolution | null> {
  const key = `resolve-${chainId}-${favorite.id}`;
  try {
    const raw = await storage.read(key);
    if (raw) {
      const cached = JSON.parse(raw) as { code: string; at: number };
      if (Date.now() - cached.at < RESOLUTION_TTL_MS) return { kind: "store", code: cached.code };
    }
  } catch {
    // una cache illeggibile si ignora
  }
  const resolver = RESOLVERS[chainId];
  if (!resolver) return { kind: "store", code: "" };
  if (!networkAllowed) return null;
  const resolution = await resolver(favorite);
  if (resolution.kind === "store") await storage.write(key, JSON.stringify({ code: resolution.code, at: Date.now() })).catch(() => undefined);
  return resolution;
}

export interface LoadOptions {
  maxAgeMs?: number;
  // Forza la verifica anche se i dati sono recenti (comunque senza riscaricare un volantino invariato).
  force?: boolean;
  // Legge solo quello che è già sul telefono, senza usare la rete: serve a mostrare subito qualcosa.
  cacheOnly?: boolean;
  onProgress?: (message: string) => void;
}

interface ChainResult {
  sources: SourceInfo[];
  offers: OfferView[];
  times: string[];
}

interface Tracker {
  begin(name: string): void;
  end(name: string): void;
}

// Cede il controllo al thread dell'interfaccia: tra un passo e l'altro i tocchi e lo scorrimento restano fluidi.
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// Coda semplice: solo poche insegne alla volta fanno lavoro pesante.
let running = 0;
const waiting: (() => void)[] = [];
async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL_SCRAPES) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await task();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

const hasValidOffers = (snapshot: Snapshot) => snapshot.offers.some((o) => Date.parse(o.validTo) >= Date.now());

// Volantino già scaricato e invariato → basta segnare la verifica; altrimenti si scarica. Restituisce un eventuale errore.
async function refreshStale(chainId: string, stale: string[], snapshots: Map<string, Snapshot | null>, storage: SnapshotStorage): Promise<string | null> {
  const fingerprint = await fingerprintOf(chainId);
  const unchanged =
    fingerprint !== null &&
    stale.every((code) => {
      const snapshot = snapshots.get(code);
      return snapshot?.fingerprint === fingerprint && Date.now() - Date.parse(snapshot.scrapedAt) < PROBE_MAX_AGE_MS && snapshot.offers.some((o) => Date.parse(o.validTo) >= Date.now());
    });
  if (unchanged) {
    const checkedAt = new Date().toISOString();
    for (const code of stale) {
      const touched = { ...(snapshots.get(code) as Snapshot), checkedAt };
      snapshots.set(code, touched);
      await storage.write(keyOf(chainId, code), JSON.stringify(touched)).catch(() => undefined);
    }
    return null;
  }
  const failure = await scrapeChain(storage, chainId, stale.filter(Boolean), fingerprint);
  if (failure === null) for (const code of stale) snapshots.set(code, await readSnapshot(storage, chainId, code));
  return failure;
}

async function loadChain(chainId: string, favorites: FavoriteRef[], storage: SnapshotStorage, options: LoadOptions, maxAge: number, track: Tracker): Promise<ChainResult> {
  const result: ChainResult = { sources: [], offers: [], times: [] };
  const chainName = CHAIN_NAMES[chainId];
  if (!chainName) {
    for (const f of favorites) result.sources.push({ storeId: f.id, storeName: f.name, chainId, chainName: f.chainName, status: "unsupported", offerCount: 0, scrapedAt: null, storeCode: null });
    return result;
  }

  const targets = new Map<string, FavoriteRef[]>();
  for (const f of favorites) {
    const resolution = await resolveCached(storage, chainId, f, !options.cacheOnly);
    if (resolution === null) {
      result.sources.push({ storeId: f.id, storeName: f.name, chainId, chainName, status: "error", offerCount: 0, scrapedAt: null, storeCode: null, note: "in attesa del primo aggiornamento" });
      continue;
    }
    if (resolution.kind === "skip") {
      result.sources.push({ storeId: f.id, storeName: f.name, chainId, chainName, status: resolution.status, offerCount: 0, scrapedAt: null, storeCode: resolution.code ?? null, note: resolution.note });
      continue;
    }
    targets.set(resolution.code, [...(targets.get(resolution.code) ?? []), f]);
  }

  const snapshots = new Map<string, Snapshot | null>();
  for (const code of targets.keys()) snapshots.set(code, await readSnapshot(storage, chainId, code));
  await yieldToUi();

  let failure: string | null = null;
  const forceMin = PROBES[chainId] ? FORCE_MIN_PROBED_MS : FORCE_MIN_BLIND_MS;
  const stale = options.cacheOnly
    ? []
    : [...targets.keys()].filter((code) => {
        const snapshot = snapshots.get(code) ?? null;
        if (!snapshot || !hasValidOffers(snapshot)) return true;
        return !isFresh(snapshot, options.force ? forceMin : maxAge);
      });
  if (stale.length > 0) {
    track.begin(chainName);
    try {
      failure = await limited(() => refreshStale(chainId, stale, snapshots, storage));
    } finally {
      track.end(chainName);
    }
    await yieldToUi();
  }

  const now = Date.now();
  for (const [code, group] of targets) {
    const snapshot = snapshots.get(code) ?? null;
    const status = snapshot ? (isFresh(snapshot, Math.max(maxAge, options.force ? forceMin : 0)) || options.cacheOnly ? "ok" : "stale") : "error";
    const checked = snapshot ? (snapshot.checkedAt ?? snapshot.scrapedAt) : null;
    for (const f of group) {
      result.sources.push({
        storeId: f.id,
        storeName: f.name,
        chainId,
        chainName,
        status,
        offerCount: snapshot?.offers.length ?? 0,
        scrapedAt: checked,
        storeCode: code || null,
        note: status !== "ok" && failure ? failure : undefined,
      });
    }
    if (!snapshot) continue;
    result.times.push(checked as string);
    const storeIds = group.map((f) => f.id);
    for (const offer of snapshot.offers) {
      if (Date.parse(offer.validTo) >= now) result.offers.push({ ...offer, promoLabel: detectMultibuy(offer.promoLabel, offer.name, offer.description, offer.packageText), chainName, storeIds });
    }
  }
  return result;
}

// Toglie gli snapshot di negozi non più preferiti e, se serve, i più vecchi finché si rientra nel limite di spazio.
async function enforceBudget(storage: SnapshotStorage, keep: Set<string>): Promise<void> {
  if (!storage.list || !storage.remove) return;
  try {
    const files = (await storage.list()).filter((f) => f.key.startsWith("offers-"));
    let total = files.reduce((sum, f) => sum + f.size, 0);
    const orphans: { key: string; size: number; at: number }[] = [];
    for (const f of files) {
      if (keep.has(f.key)) continue;
      const raw = await storage.read(f.key);
      let at = 0;
      try {
        at = raw ? Date.parse((JSON.parse(raw) as Snapshot).scrapedAt) : 0;
      } catch {
        at = 0;
      }
      orphans.push({ ...f, at });
    }
    orphans.sort((a, b) => a.at - b.at);
    for (const orphan of orphans) {
      if (total <= STORAGE_BUDGET_BYTES && Date.now() - orphan.at < ORPHAN_MAX_AGE_MS) continue;
      await storage.remove(orphan.key);
      total -= orphan.size;
    }
  } catch {
    // la pulizia è un'ottimizzazione: un errore non deve bloccare le offerte
  }
}

// Offerte attive dei supermercati preferiti: legge gli snapshot recenti, verifica se i volantini sono cambiati e scarica solo quelli nuovi.
export async function loadOffers(favorites: FavoriteRef[], storage: SnapshotStorage, options: LoadOptions = {}): Promise<OffersResponse> {
  const maxAge = options.maxAgeMs ?? MAX_AGE_MS;
  const byChain = new Map<string, FavoriteRef[]>();
  const seen = new Set<string>();
  for (const favorite of favorites) {
    if (seen.has(favorite.id)) continue;
    seen.add(favorite.id);
    byChain.set(favorite.chainId, [...(byChain.get(favorite.chainId) ?? []), favorite]);
  }

  // Le insegne sono indipendenti: si scaricano insieme invece che una dopo l'altra.
  const active = new Set<string>();
  const report = () => options.onProgress?.(active.size > 0 ? `Scarico i volantini: ${[...active].join(", ")}` : "");
  const track: Tracker = {
    begin: (name) => {
      active.add(name);
      report();
    },
    end: (name) => {
      active.delete(name);
      report();
    },
  };
  const results = await Promise.all(
    [...byChain].map(([chainId, chainFavorites]) =>
      loadChain(chainId, chainFavorites, storage, options, maxAge, track).catch(
        (error): ChainResult => ({
          sources: chainFavorites.map((f) => ({ storeId: f.id, storeName: f.name, chainId, chainName: f.chainName, status: "error", offerCount: 0, scrapedAt: null, storeCode: null, note: (error as Error).message })),
          offers: [],
          times: [],
        }),
      ),
    ),
  );

  const sources = results.flatMap((r) => r.sources);
  const offers = results.flatMap((r) => r.offers);
  const times = results.flatMap((r) => r.times).sort();

  if (!options.cacheOnly) {
    const keep = new Set(sources.filter((s) => s.chainId in CHAIN_NAMES).map((s) => keyOf(s.chainId, s.storeCode ?? "")));
    await enforceBudget(storage, keep);
  }
  return { generatedAt: times[0] ?? null, offers, sources };
}

// Pulizia all'avvio: tiene sul telefono solo ciò che serve (negozi preferiti, volantini ancora validi o scaduti da poco, sotto il limite di spazio).
export async function pruneStorage(favorites: FavoriteRef[], storage: SnapshotStorage): Promise<void> {
  if (!storage.list || !storage.remove) return;
  try {
    const favoriteIds = favorites.map((f) => f.id.replace(/[^a-zA-Z0-9_-]/g, "_"));
    const files = await storage.list();
    for (const file of files) {
      if (file.key.startsWith("resolve-")) {
        // Associazioni negozio→volantino: sparisce quella di un negozio non più preferito o scaduta.
        const raw = await storage.read(file.key);
        const at = raw ? ((JSON.parse(raw) as { at?: number }).at ?? 0) : 0;
        if (!favoriteIds.some((id) => file.key.endsWith(`-${id}`)) || Date.now() - at > RESOLUTION_TTL_MS) await storage.remove(file.key);
      } else if (file.key.startsWith("offers-")) {
        const raw = await storage.read(file.key);
        const snapshot = raw ? (JSON.parse(raw) as Snapshot) : null;
        if (!snapshot || (!hasValidOffers(snapshot) && Date.now() - Date.parse(snapshot.checkedAt ?? snapshot.scrapedAt) > EXPIRED_KEEP_MS)) await storage.remove(file.key);
      }
    }
  } catch {
    // la pulizia non deve mai bloccare l'app
  }
}
