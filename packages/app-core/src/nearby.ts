import { detectChain } from "./chains";
import { dedupeStores, type RawStore } from "./geo";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
// Ultime ricerche in memoria: tornare sulla stessa zona non rifà la richiesta.
const CACHE_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; stores: RawStore[] }>();
const USER_AGENT = "SalvaSpesa/0.1 (progetto personale di confronto volantini)";
export const MAX_RADIUS_KM = 25;
// Solo insegne di supermercati note: negozietti e attività con tag "supermarket" generici non servono al confronto dei volantini.
const KNOWN_CHAINS = "esselunga|conad|coop|lidl|eurospin|carrefour|pam|panorama|penny|aldi|md|despar|eurospar|interspar|famila|superstore|bennet|tigros|ekom|gulliver|tosano|iper|todis|crai|dok|sigma|simply|gigante|basko|natura";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function toStore(element: OverpassElement): RawStore | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (lat === undefined || lng === undefined) return null;
  const tags = element.tags ?? {};
  const chain = detectChain(tags.brand, tags.name, tags.operator);
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const address = [street, tags["addr:city"]].filter(Boolean).join(", ");
  return { id: `${element.type}/${element.id}`, name: tags.name ?? tags.brand ?? "Supermercato", chainId: chain.id, chainName: chain.name, address, lat, lng };
}

// Supermercati di OpenStreetMap nel raggio indicato: si interrogano più server in parallelo e vince il primo che risponde.
export async function fetchNearbyStores(lat: number, lng: number, radiusKm: number, onUpdate?: (stores: RawStore[]) => void): Promise<RawStore[]> {
  const radius = Math.min(Math.max(radiusKm, 1), MAX_RADIUS_KM);
  const cacheKey = `${Math.round(lat * 100)}:${Math.round(lng * 100)}:${Math.round(radius)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.stores;
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  const around = `(around:${Math.round(radius * 1000)},${roundedLat},${roundedLng})`;
  const matches = ["name", "brand", "operator"].map((tag) => `nwr["shop"="supermarket"]["${tag}"~"${KNOWN_CHAINS}",i]${around};`).join("");
  const query = `[out:json][timeout:25];(${matches});out center tags 400;`;
  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    // Un server lento non deve far aspettare minuti: dopo 40 secondi si rinuncia a quello e vince un altro.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Overpass ${response.status}`);
      return ((await response.json()) as { elements?: OverpassElement[] }).elements ?? [];
    } finally {
      clearTimeout(timer);
    }
  });
  // Overpass è completo ma spesso sovraccarico: se non risponde entro pochi secondi parte Nominatim, più rapido ma meno completo.
  // In quel caso si mostrano subito i risultati rapidi e, quando Overpass finisce, la lista viene completata (onUpdate).
  const toStores = (elements: OverpassElement[]) =>
    // Il filtro del server è largo (nomi brevi come "md" o "pam"): quello preciso è riconoscere l'insegna.
    dedupeStores(elements.map(toStore).filter((store): store is RawStore => store !== null && store.chainId !== "altro"));
  const full = Promise.any(attempts).then(toStores);
  const quick = new Promise<RawStore[]>((resolve, reject) => {
    setTimeout(() => nominatimStores(lat, lng, radius).then((elements) => resolve(toStores(elements)), reject), 5000);
  });
  let first: { stores: RawStore[]; complete: boolean };
  try {
    first = await Promise.any([full.then((stores) => ({ stores, complete: true })), quick.then((stores) => ({ stores, complete: false }))]);
  } catch {
    throw new Error("Nessun servizio di mappe ha risposto");
  }
  if (first.complete) cache.set(cacheKey, { at: Date.now(), stores: first.stores });
  else
    full.then(
      (stores) => {
        cache.set(cacheKey, { at: Date.now(), stores });
        onUpdate?.(stores);
      },
      () => undefined,
    );
  return first.stores;
}

// Insegne cercate una per una su Nominatim: la ricerca generica "supermercato" ne restituisce al massimo 50 e ne perde.
const QUICK_QUERIES = ["supermercato", "esselunga", "ekom", "conad", "coop", "lidl", "eurospin", "carrefour", "md", "penny", "pam", "aldi", "tigros", "despar", "iper"];

async function nominatimOne(q: string, viewbox: string): Promise<OverpassElement[]> {
  const params = new URLSearchParams({ q, format: "jsonv2", limit: "50", bounded: "1", viewbox, "accept-language": "it" });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const results = (await response.json()) as { osm_type: string; osm_id: number; lat: string; lon: string; name?: string; category?: string; type?: string }[];
  return results
    .filter((r) => r.category === "shop" && r.type === "supermarket")
    .map((r) => ({ type: r.osm_type, id: r.osm_id, lat: Number(r.lat), lon: Number(r.lon), tags: { name: r.name ?? "" } }));
}

async function nominatimStores(lat: number, lng: number, radiusKm: number): Promise<OverpassElement[]> {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
  const viewbox = `${lng - dLng},${lat + dLat},${lng + dLng},${lat - dLat}`;
  const all: OverpassElement[] = [];
  let ok = false;
  // Tre richieste alla volta, per rispettare il servizio gratuito.
  for (let i = 0; i < QUICK_QUERIES.length; i += 3) {
    const batch = await Promise.allSettled(QUICK_QUERIES.slice(i, i + 3).map((q) => nominatimOne(q, viewbox)));
    for (const result of batch)
      if (result.status === "fulfilled") {
        ok = true;
        all.push(...result.value);
      }
  }
  if (!ok) throw new Error("Nominatim non risponde");
  return all;
}

export interface GeocodedPlace {
  lat: number;
  lng: number;
  label: string;
}

// Indirizzo o città scritti a mano → coordinate, tramite Nominatim (OpenStreetMap), limitato all'Italia.
export async function geocodeAddress(query: string): Promise<GeocodedPlace | null> {
  const text = query.trim();
  if (text.length < 3) return null;
  const params = new URLSearchParams({ q: text, format: "jsonv2", limit: "1", countrycodes: "it", "accept-language": "it" });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Ricerca indirizzo: HTTP ${response.status}`);
  const results = (await response.json()) as { lat: string; lon: string; display_name: string }[];
  const first = results[0];
  if (!first) return null;
  return { lat: Number(first.lat), lng: Number(first.lon), label: first.display_name.split(",").slice(0, 2).join(",").trim() };
}
