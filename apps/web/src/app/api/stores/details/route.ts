import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OVERPASS_ENDPOINTS = [
  "https://overpass.openstreetmap.fr/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const USER_AGENT = "SpesaChiara/0.1 (progetto personale di confronto volantini)";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface StoreDetails {
  address: string;
  hours: string | null;
  phone: string | null;
  website: string | null;
}

const cache = new Map<string, { at: number; details: StoreDetails }>();

async function fetchTags(type: string, id: string): Promise<Record<string, string>> {
  const query = `[out:json][timeout:25];${type}(${id});out tags;`;
  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Overpass ${response.status}`);
    const data = (await response.json()) as { elements?: { tags?: Record<string, string> }[] };
    return data.elements?.[0]?.tags ?? {};
  });
  return Promise.any(attempts);
}

// Molti negozi su OpenStreetMap non hanno l'indirizzo: lo ricavo dalle coordinate.
async function reverseAddress(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "it" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return "";
    const data = (await response.json()) as { address?: Record<string, string> };
    const a = data.address ?? {};
    const street = [a.road ?? a.pedestrian, a.house_number].filter(Boolean).join(" ");
    const city = a.city ?? a.town ?? a.village ?? a.municipality;
    return [street, [a.postcode, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const match = /^(node|way|relation)\/(\d{1,12})$/.exec(searchParams.get("id") ?? "");
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!match || !Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  const key = match[0];
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return NextResponse.json(cached.details);

  try {
    const tags = await fetchTags(match[1], match[2]);
    const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
    let address = [street, [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    if (!street) address = (await reverseAddress(lat, lng)) || address;
    const details: StoreDetails = {
      address,
      hours: tags.opening_hours ?? null,
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
    };
    cache.set(key, { at: Date.now(), details });
    return NextResponse.json(details);
  } catch {
    return NextResponse.json({ error: "Dettagli non raggiungibili, riprova tra poco" }, { status: 502 });
  }
}
