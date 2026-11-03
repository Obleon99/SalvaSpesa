import { detectChain } from "./chains";
import { dedupeStores, type RawStore } from "./geo";

const OVERPASS_ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const USER_AGENT = "SpesaChiara/0.1 (progetto personale di confronto volantini)";
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
export async function fetchNearbyStores(lat: number, lng: number, radiusKm: number): Promise<RawStore[]> {
  const radius = Math.min(Math.max(radiusKm, 1), MAX_RADIUS_KM);
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  const around = `(around:${Math.round(radius * 1000)},${roundedLat},${roundedLng})`;
  const matches = ["name", "brand", "operator"].map((tag) => `nwr["shop"="supermarket"]["${tag}"~"${KNOWN_CHAINS}",i]${around};`).join("");
  const query = `[out:json][timeout:50];(${matches});out center tags 400;`;
  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) throw new Error(`Overpass ${response.status}`);
    return ((await response.json()) as { elements?: OverpassElement[] }).elements ?? [];
  });
  const elements = await Promise.any(attempts);
  // Il filtro del server è largo (nomi brevi come "md" o "pam"): quello preciso è riconoscere l'insegna.
  return dedupeStores(elements.map(toStore).filter((store): store is RawStore => store !== null && store.chainId !== "altro"));
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
