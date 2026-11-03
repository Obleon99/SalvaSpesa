import { haversineKm } from "./geo";
import type { FavoriteRef } from "./offers-types";

const USER_AGENT = "Mozilla/5.0 (compatible; SpesaChiaraBot/0.1; progetto personale di confronto prezzi)";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_STORE_DISTANCE_KM = 1;

// Insegne con prezzi diversi per negozio o regione: dal negozio preferito si ricava il codice del volantino da usare.
export type Resolution =
  | { kind: "store"; code: string }
  | { kind: "skip"; status: "unsupported" | "unresolved"; note: string; code?: string };

interface EsselungaStore {
  abbrev: string;
  description: string;
  lat: number;
  lng: number;
  laEsse: boolean;
}

let esselungaStores: { at: number; stores: EsselungaStore[] } | null = null;

async function loadEsselungaStores(): Promise<EsselungaStore[]> {
  if (esselungaStores && Date.now() - esselungaStores.at < DAY_MS) return esselungaStores.stores;
  const response = await fetch("https://www.esselunga.it/services/istituzionale35/all-stores.json", { headers: { "User-Agent": USER_AGENT } });
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

async function resolveEsselunga(favorite: FavoriteRef): Promise<Resolution> {
  let best: { store: EsselungaStore; km: number } | null = null;
  try {
    for (const store of await loadEsselungaStores()) {
      const km = haversineKm(favorite, store);
      if (!best || km < best.km) best = { store, km };
    }
  } catch {
    best = null;
  }
  if (!best || best.km > MAX_STORE_DISTANCE_KM) return { kind: "skip", status: "unresolved", note: "Non riesco a collegare questo negozio all'elenco ufficiale Esselunga" };
  if (best.store.laEsse) return { kind: "skip", status: "unsupported", code: best.store.abbrev, note: "I negozi La Esse non hanno un volantino online" };
  return { kind: "store", code: best.store.abbrev };
}

const EKOM_LEAFLETS_URL = "https://www.ekomdiscount.it/ebsn/api/leaflet/search?parent_leaflet_type_id=1";
const normalizeRegion = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

let ekomLeaflets: { at: number; leaflets: { code: string; regions: string[] }[] } | null = null;
const regionCache = new Map<string, { at: number; region: string | null }>();

async function loadEkomLeaflets() {
  if (ekomLeaflets && Date.now() - ekomLeaflets.at < 6 * 60 * 60 * 1000) return ekomLeaflets.leaflets;
  const response = await fetch(EKOM_LEAFLETS_URL, { headers: { "User-Agent": USER_AGENT } });
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
  if (cached && Date.now() - cached.at < DAY_MS) return cached.region;
  const params = `format=jsonv2&lat=${lat}&lon=${lng}&zoom=5&accept-language=it`;
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: { "User-Agent": USER_AGENT } });
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
const coopUnsupported: Resolution = { kind: "skip", status: "unsupported", note: "Non trovo questo punto vendita tra quelli con volantino online (per ora solo Coop Liguria)" };

async function resolveCoop(favorite: FavoriteRef): Promise<Resolution> {
  const key = `${favorite.lat.toFixed(4)},${favorite.lng.toFixed(4)}`;
  const cached = coopCache.get(key);
  if (cached && Date.now() - cached.at < DAY_MS) return cached.code ? { kind: "store", code: cached.code } : coopUnsupported;
  try {
    const response = await fetch(COOP_LOCATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ id_canale: "15", id_subcanale: "16", tipo: "punti_vendita", lat: favorite.lat, lng: favorite.lng, allowed: 1, uri: "/coopliguria.html", landing: "coopliguria" }),
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

export const RESOLVERS: Record<string, (favorite: FavoriteRef) => Promise<Resolution>> = {
  esselunga: resolveEsselunga,
  ekom: resolveEkom,
  coop: resolveCoop,
};
