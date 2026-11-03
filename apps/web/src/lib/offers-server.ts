import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScrapedOffer } from "@salvaspesa/shared-types";
import { haversineKm } from "./geo";
import type { FavoriteRef, HistoryPoint, OfferView, OffersResponse, SourceInfo } from "./offers-types";

const DATA_DIR = path.resolve(process.cwd(), "../../data/offers");
const SCRAPERS_DIR = path.resolve(process.cwd(), "../scrapers");
const TSX_CLI = path.join(SCRAPERS_DIR, "node_modules", "tsx", "dist", "cli.mjs");
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const SCRAPE_TIMEOUT_MS = 4 * 60 * 1000;
const CATALOG_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_STORE_DISTANCE_KM = 1;
const USER_AGENT = "Mozilla/5.0 (compatible; SpesaChiaraBot/0.1; progetto personale di confronto prezzi)";

const CHAIN_NAMES: Record<string, string> = {
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

export const CHAIN_DISPLAY_NAMES = CHAIN_NAMES;

export const SUPPORTED_CHAINS = new Set(Object.keys(CHAIN_NAMES));

interface Snapshot {
  scrapedAt: string;
  offers: ScrapedOffer[];
}

interface EsselungaStore {
  abbrev: string;
  description: string;
  lat: number;
  lng: number;
  laEsse: boolean;
}

let esselungaStores: { at: number; stores: EsselungaStore[] } | null = null;

async function loadEsselungaStores(): Promise<EsselungaStore[]> {
  if (esselungaStores && Date.now() - esselungaStores.at < 24 * 60 * 60 * 1000) return esselungaStores.stores;
  const response = await fetch("https://www.esselunga.it/services/istituzionale35/all-stores.json", {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`elenco negozi Esselunga: HTTP ${response.status}`);
  const data = (await response.json()) as {
    stores?: { abbrev?: string; description?: string; latitude?: number; longitude?: number; laEsse?: boolean }[];
  };
  const stores = (data.stores ?? [])
    .filter((s) => s.abbrev && typeof s.latitude === "number" && typeof s.longitude === "number")
    .map((s) => ({
      abbrev: s.abbrev as string,
      description: s.description ?? s.abbrev ?? "",
      lat: s.latitude as number,
      lng: s.longitude as number,
      laEsse: s.laEsse === true,
    }));
  esselungaStores = { at: Date.now(), stores };
  return stores;
}

async function resolveEsselungaStore(lat: number, lng: number): Promise<EsselungaStore | null> {
  const stores = await loadEsselungaStores();
  let best: { store: EsselungaStore; km: number } | null = null;
  for (const store of stores) {
    const km = haversineKm({ lat, lng }, store);
    if (!best || km < best.km) best = { store, km };
  }
  return best && best.km <= MAX_STORE_DISTANCE_KM ? best.store : null;
}

// Insegne con prezzi diversi per negozio o regione: dal negozio preferito si ricava il codice del volantino da usare.
type Resolution =
  | { kind: "store"; code: string }
  | { kind: "skip"; status: "unsupported" | "unresolved"; note: string; code?: string };

async function resolveEsselunga(favorite: FavoriteRef): Promise<Resolution> {
  let store: EsselungaStore | null = null;
  try {
    store = await resolveEsselungaStore(favorite.lat, favorite.lng);
  } catch {
    store = null;
  }
  if (!store) return { kind: "skip", status: "unresolved", note: "Non riesco a collegare questo negozio all'elenco ufficiale Esselunga" };
  if (store.laEsse) return { kind: "skip", status: "unsupported", code: store.abbrev, note: "I negozi La Esse non hanno un volantino online" };
  return { kind: "store", code: store.abbrev };
}

const EKOM_LEAFLETS_URL = "https://www.ekomdiscount.it/ebsn/api/leaflet/search?parent_leaflet_type_id=1";
const normalizeRegion = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

let ekomLeaflets: { at: number; leaflets: { code: string; regions: string[] }[] } | null = null;
const regionCache = new Map<string, { at: number; region: string | null }>();

async function loadEkomLeaflets() {
  if (ekomLeaflets && Date.now() - ekomLeaflets.at < MAX_AGE_MS) return ekomLeaflets.leaflets;
  const response = await fetch(EKOM_LEAFLETS_URL, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`volantini Ekom: HTTP ${response.status}`);
  const data = (await response.json()) as { data?: { leaflets?: { descr?: string; location?: string }[] } };
  const leaflets = (data.data?.leaflets ?? [])
    .map((l) => ({
      code: l.location?.match(/-([A-Za-z]{2,6})\.pdf$/i)?.[1].toUpperCase() ?? "",
      regions: (l.descr ?? "").split(/\s*(?:,|\be\b)\s*/i).map(normalizeRegion).filter(Boolean),
    }))
    .filter((l) => l.code);
  ekomLeaflets = { at: Date.now(), leaflets };
  return leaflets;
}

async function regionOf(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
  const cached = regionCache.get(key);
  if (cached && Date.now() - cached.at < 24 * 60 * 60 * 1000) return cached.region;
  const params = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lng), zoom: "5", "accept-language": "it" });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`regione: HTTP ${response.status}`);
  const data = (await response.json()) as { address?: { state?: string } };
  const region = data.address?.state ? normalizeRegion(data.address.state) : null;
  regionCache.set(key, { at: Date.now(), region });
  return region;
}

async function resolveEkom(favorite: FavoriteRef): Promise<Resolution> {
  try {
    const [leaflets, region] = await Promise.all([loadEkomLeaflets(), regionOf(favorite.lat, favorite.lng)]);
    if (!region) return { kind: "skip", status: "unresolved", note: "Non riesco a capire in che regione si trova questo negozio" };
    const match = leaflets.find((l) => l.regions.includes(region));
    if (!match) return { kind: "skip", status: "unsupported", note: `Ekom non ha un volantino per questa regione (${region})` };
    return { kind: "store", code: match.code };
  } catch {
    return { kind: "skip", status: "unresolved", note: "Non riesco a leggere i volantini Ekom in questo momento" };
  }
}

// Coop Liguria: Volantino Più elenca i punti vendita con la pagina del loro volantino. Il negozio preferito si abbina al più vicino (entro 400 m).
const COOP_LOCATOR_URL = "https://negozi.volantinopiu.com/public/ajax/get.maps.php";
const COOP_MAX_DISTANCE_KM = 0.4;
const coopCache = new Map<string, { at: number; code: string | null }>();

async function resolveCoop(favorite: FavoriteRef): Promise<Resolution> {
  const key = `${favorite.lat.toFixed(4)},${favorite.lng.toFixed(4)}`;
  const cached = coopCache.get(key);
  if (cached && Date.now() - cached.at < 24 * 60 * 60 * 1000) {
    return cached.code ? { kind: "store", code: cached.code } : coopUnsupported;
  }
  try {
    const response = await fetch(COOP_LOCATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ id_canale: "15", id_subcanale: "16", tipo: "punti_vendita", lat: favorite.lat, lng: favorite.lng, allowed: 1, uri: "/coopliguria.html", landing: "coopliguria" }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { points?: { Latitude: string; Longitude: string; landing?: string }[] };
    let best: { km: number; code: string } | null = null;
    for (const point of data.points ?? []) {
      const code = point.landing?.match(/ccno-(\d+)\.html/)?.[1];
      const km = haversineKm(favorite, { lat: Number(point.Latitude), lng: Number(point.Longitude) });
      if (code && Number.isFinite(km) && (!best || km < best.km)) best = { km, code };
    }
    const code = best && best.km <= COOP_MAX_DISTANCE_KM ? best.code : null;
    coopCache.set(key, { at: Date.now(), code });
    return code ? { kind: "store", code } : coopUnsupported;
  } catch {
    return { kind: "skip", status: "unresolved", note: "Non riesco a leggere i volantini Coop in questo momento" };
  }
}

const coopUnsupported: Resolution = { kind: "skip", status: "unsupported", note: "Non trovo questo punto vendita tra quelli con volantino online (per ora solo Coop Liguria)" };

const RESOLVERS: Record<string, (favorite: FavoriteRef) => Promise<Resolution>> = {
  esselunga: resolveEsselunga,
  ekom: resolveEkom,
  coop: resolveCoop,
};

const snapshotDir = (chainId: string, storeCode?: string) => path.join(DATA_DIR, chainId, storeCode ?? "");

async function readSnapshot(chainId: string, storeCode?: string): Promise<Snapshot | null> {
  try {
    const raw = await readFile(path.join(snapshotDir(chainId, storeCode), "latest.json"), "utf8");
    return JSON.parse(raw) as Snapshot;
  } catch {
    return null;
  }
}

const isFresh = (snapshot: Snapshot | null) => snapshot !== null && Date.now() - Date.parse(snapshot.scrapedAt) < MAX_AGE_MS;

const inFlight = new Map<string, Promise<boolean>>();

export function runScraper(chainId: string, storeCodes: string[], catalog = false): Promise<boolean> {
  const key = `${catalog ? "catalog:" : ""}${chainId}:${[...storeCodes].sort().join(",")}`;
  const running = inFlight.get(key);
  if (running) return running;

  const job = new Promise<boolean>((resolve) => {
    const env = { ...process.env, ...(chainId === "esselunga" && storeCodes.length > 0 ? { ESSELUNGA_STORES: storeCodes.join(",") } : {}), ...(chainId === "coop" && storeCodes.length > 0 ? { COOP_STORES: storeCodes.join(",") } : {}) };
    const child = spawn(process.execPath, [TSX_CLI, "src/run.ts", chainId, ...(catalog ? ["--catalog"] : [])], {
      cwd: SCRAPERS_DIR,
      env,
      stdio: "ignore",
      windowsHide: true,
    });
    const timer = setTimeout(() => child.kill(), catalog ? CATALOG_TIMEOUT_MS : SCRAPE_TIMEOUT_MS);
    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  }).finally(() => inFlight.delete(key));

  inFlight.set(key, job);
  return job;
}

// Registra quali insegne e negozi segue l'utente: lo script di aggiornamento giornaliero legge questo file.
async function trackSelection(chains: string[], esselungaCodes: string[], coopCodes: string[]): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(
      path.resolve(DATA_DIR, "../tracked.json"),
      JSON.stringify({ updatedAt: new Date().toISOString(), chains: [...new Set(chains)].sort(), esselunga: [...new Set(esselungaCodes)].sort().slice(0, 20), coop: [...new Set(coopCodes)].sort().slice(0, 20) }, null, 2),
    );
  } catch {
    // il tracciamento è facoltativo: senza, l'aggiornamento giornaliero usa i valori predefiniti
  }
}

export async function getOffersForFavorites(favorites: FavoriteRef[]): Promise<OffersResponse> {
  const sources: SourceInfo[] = [];
  const offers: OfferView[] = [];
  const scrapedTimes: string[] = [];
  const trackedChains: string[] = [];
  const trackedEsselunga: string[] = [];
  const trackedCoop: string[] = [];

  const byChain = new Map<string, FavoriteRef[]>();
  for (const favorite of favorites) byChain.set(favorite.chainId, [...(byChain.get(favorite.chainId) ?? []), favorite]);

  for (const [chainId, chainFavorites] of byChain) {
    const chainName = CHAIN_NAMES[chainId];
    if (!chainName) {
      for (const f of chainFavorites) sources.push({ storeId: f.id, storeName: f.name, chainId, chainName: f.chainName, status: "unsupported", offerCount: 0, scrapedAt: null, storeCode: null });
      continue;
    }

    const targets = new Map<string, { storeCode?: string; favorites: FavoriteRef[] }>();
    const resolver = RESOLVERS[chainId];
    if (resolver) {
      for (const f of chainFavorites) {
        const resolution = await resolver(f);
        if (resolution.kind === "skip") {
          sources.push({ storeId: f.id, storeName: f.name, chainId, chainName, status: resolution.status, offerCount: 0, scrapedAt: null, storeCode: resolution.code ?? null, note: resolution.note });
          continue;
        }
        const target = targets.get(resolution.code) ?? { storeCode: resolution.code, favorites: [] };
        target.favorites.push(f);
        targets.set(resolution.code, target);
      }
    } else {
      targets.set("", { favorites: chainFavorites });
    }

    if (targets.size > 0) trackedChains.push(chainId);
    if (chainId === "coop") trackedCoop.push(...[...targets.values()].map((t) => t.storeCode).filter((c): c is string => Boolean(c)));
    if (chainId === "esselunga") trackedEsselunga.push(...[...targets.values()].map((t) => t.storeCode).filter((c): c is string => Boolean(c)));

    const snapshots = new Map<string, Snapshot | null>();
    for (const [key, target] of targets) snapshots.set(key, await readSnapshot(chainId, target.storeCode));
    const stale = [...targets.entries()].filter(([key]) => !isFresh(snapshots.get(key) ?? null));
    if (stale.length > 0) {
      const ok = await runScraper(chainId, stale.map(([, t]) => t.storeCode).filter((c): c is string => Boolean(c)));
      if (ok) for (const [key, target] of stale) snapshots.set(key, await readSnapshot(chainId, target.storeCode));
    }

    for (const [key, target] of targets) {
      const snapshot = snapshots.get(key) ?? null;
      const fresh = isFresh(snapshot);
      for (const f of target.favorites) {
        sources.push({
          storeId: f.id,
          storeName: f.name,
          chainId,
          chainName,
          status: snapshot ? (fresh ? "ok" : "stale") : "error",
          offerCount: snapshot?.offers.length ?? 0,
          scrapedAt: snapshot?.scrapedAt ?? null,
          storeCode: target.storeCode ?? null,
        });
      }
      if (!snapshot) continue;
      scrapedTimes.push(snapshot.scrapedAt);
      const now = Date.now();
      for (const offer of snapshot.offers) {
        if (Date.parse(offer.validTo) < now) continue;
        offers.push({ ...offer, chainName, storeIds: target.favorites.map((f) => f.id) });
      }
    }
  }

  await trackSelection(trackedChains, trackedEsselunga, trackedCoop);
  scrapedTimes.sort();
  return { generatedAt: scrapedTimes[0] ?? null, offers, sources };
}

const HISTORY_DIR = path.resolve(process.cwd(), "../../data/history");

// Storico compatto scritto dagli scraper (un punto a ogni cambio di prezzo, "seen" = ultimo giorno visto).
async function compactHistory(chainId: string, externalId: string, storeCode: string | undefined, days: number): Promise<HistoryPoint[] | null> {
  try {
    const file = JSON.parse(await readFile(path.join(HISTORY_DIR, chainId, `${storeCode || "all"}.json`), "utf8")) as Record<string, { p: [string, number, number | null][]; seen: string }>;
    const entry = file[externalId];
    if (!entry) return [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const points: HistoryPoint[] = entry.p.map(([date, price, originalPrice]) => ({ date, price, originalPrice }));
    const last = points[points.length - 1];
    if (last && entry.seen > last.date) points.push({ ...last, date: entry.seen });
    // Il punto precedente alla finestra tiene il prezzo valido all'inizio del periodo.
    const inside = points.filter((point) => point.date >= cutoff);
    const before = points.filter((point) => point.date < cutoff).pop();
    return before && inside[0]?.date !== cutoff ? [{ ...before, date: cutoff }, ...inside] : inside;
  } catch {
    return null;
  }
}

export async function getHistory(chainId: string, externalId: string, storeCode?: string, days = 30): Promise<HistoryPoint[]> {
  const compact = await compactHistory(chainId, externalId, storeCode, days);
  if (compact) return compact;
  let files: string[];
  try {
    files = (await readdir(snapshotDir(chainId, storeCode))).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  } catch {
    return [];
  }
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const points: HistoryPoint[] = [];
  for (const file of files.filter((f) => f.slice(0, 10) >= cutoff)) {
    try {
      const snapshot = JSON.parse(await readFile(path.join(snapshotDir(chainId, storeCode), file), "utf8")) as Snapshot;
      const offer = snapshot.offers.find((o) => o.externalId === externalId);
      if (offer) points.push({ date: file.slice(0, 10), price: offer.price, originalPrice: offer.originalPrice });
    } catch {
      // snapshot illeggibile: si salta quel giorno
    }
  }
  return points;
}
