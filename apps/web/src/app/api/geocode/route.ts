import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const USER_AGENT = "SpesaChiara/0.1 (progetto personale di confronto volantini)";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

function buildLabel(result: NominatimResult): string {
  const address = result.address;
  const city = address?.city ?? address?.town ?? address?.village ?? address?.municipality;
  const base = [city, address?.road].filter(Boolean).join(", ") || result.display_name.split(",").slice(0, 2).join(",");
  return address?.postcode ? `${base} (CAP ${address.postcode})` : base;
}

function toLocation(result: NominatimResult) {
  return { label: buildLabel(result), lat: Number(result.lat), lng: Number(result.lon) };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");

  let url: string;
  if (query) {
    if (query.length < 3 || query.length > 120) {
      return NextResponse.json({ error: "Inserisci almeno 3 caratteri" }, { status: 400 });
    }
    const params = new URLSearchParams({
      format: "jsonv2",
      q: query,
      countrycodes: "it",
      limit: "5",
      addressdetails: "1",
      "accept-language": "it",
    });
    url = `${NOMINATIM_URL}/search?${params}`;
  } else if (latParam !== null && lngParam !== null) {
    const lat = Number(latParam);
    const lng = Number(lngParam);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "Coordinate non valide" }, { status: 400 });
    }
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(lat),
      lon: String(lng),
      zoom: "18",
      addressdetails: "1",
      "accept-language": "it",
    });
    url = `${NOMINATIM_URL}/reverse?${params}`;
  } else {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const data = (await response.json()) as NominatimResult | NominatimResult[] | { error: string };
    if (Array.isArray(data)) {
      return NextResponse.json({ results: data.map(toLocation) });
    }
    if ("error" in data) {
      return NextResponse.json({ results: [] });
    }
    return NextResponse.json({ results: [toLocation(data)] });
  } catch {
    return NextResponse.json({ error: "Servizio indirizzi non raggiungibile, riprova tra poco" }, { status: 502 });
  }
}
