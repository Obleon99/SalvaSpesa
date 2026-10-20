import { NextResponse } from "next/server";
import { getOffersForFavorites } from "@/lib/offers-server";
import type { FavoriteRef } from "@/lib/offers-types";

export const dynamic = "force-dynamic";

const MAX_FAVORITES = 30;

function parseFavorites(body: unknown): FavoriteRef[] | null {
  const stores = (body as { stores?: unknown })?.stores;
  if (!Array.isArray(stores) || stores.length > MAX_FAVORITES) return null;
  const parsed: FavoriteRef[] = [];
  for (const item of stores) {
    const s = item as Partial<FavoriteRef>;
    if (
      typeof s.id !== "string" ||
      typeof s.chainId !== "string" ||
      typeof s.name !== "string" ||
      typeof s.chainName !== "string" ||
      typeof s.lat !== "number" ||
      typeof s.lng !== "number" ||
      !Number.isFinite(s.lat) ||
      !Number.isFinite(s.lng)
    ) {
      return null;
    }
    parsed.push({ id: s.id, chainId: s.chainId, name: s.name, chainName: s.chainName, lat: s.lat, lng: s.lng });
  }
  return parsed;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const favorites = parseFavorites(body);
  if (!favorites) return NextResponse.json({ error: "Elenco supermercati non valido" }, { status: 400 });

  try {
    return NextResponse.json(await getOffersForFavorites(favorites));
  } catch {
    return NextResponse.json({ error: "Non riesco a leggere le offerte, riprova tra poco" }, { status: 500 });
  }
}
