import { NextResponse } from "next/server";
import { detectChain } from "@/lib/chains";
import type { RawStore } from "@/lib/geo";

export const dynamic = "force-dynamic";

const OVERPASS_ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const USER_AGENT = "SpesaChiara/0.1 (progetto personale di confronto volantini)";
const MAX_RADIUS_KM = 25;
const REQUEST_TIMEOUT_MS = 60000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const cache = new Map<string, { at: number; stores: RawStore[] }>();

async function queryOverpass(query: string): Promise<OverpassElement[]> {
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
      body: new URLSearchParams({ data: query }),
      signal,
    });
    if (!response.ok) throw new Error(`Overpass ${response.status}`);
    const data = (await response.json()) as { elements?: OverpassElement[] };
    return data.elements ?? [];
  });
  try {
    return await Promise.any(attempts);
  } finally {
    controller.abort();
  }
}

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

  return {
    id: `${element.type}/${element.id}`,
    name: tags.name ?? tags.brand ?? "Supermercato",
    chainId: chain.id,
    chainName: chain.name,
    address,
    lat,
    lng,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (latParam === null || lngParam === null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Coordinate non valide" }, { status: 400 });
  }

  const radiusKm = Math.min(Math.max(Number(searchParams.get("radius")) || 5, 1), MAX_RADIUS_KM);
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  const cacheKey = `${roundedLat},${roundedLng},${radiusKm}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ stores: cached.stores });
  }

  const query = `[out:json][timeout:50];nwr["shop"="supermarket"](around:${Math.round(radiusKm * 1000)},${roundedLat},${roundedLng});out center tags 400;`;

  try {
    const elements = await queryOverpass(query);
    const stores = elements.map(toStore).filter((store): store is RawStore => store !== null);
    cache.set(cacheKey, { at: Date.now(), stores });
    return NextResponse.json({ stores });
  } catch {
    return NextResponse.json({ error: "Servizio supermercati non raggiungibile, riprova tra poco" }, { status: 502 });
  }
}
