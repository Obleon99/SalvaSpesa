import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog-server";
import type { FavoriteRef } from "@/lib/offers-types";

export const dynamic = "force-dynamic";

const MAX_FAVORITES = 30;
const ID = /^[a-z0-9-]{1,40}$/;

function parseFavorites(stores: unknown): FavoriteRef[] | null {
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

const optionalId = (value: unknown): string | undefined | null =>
  value === undefined || value === "" ? undefined : typeof value === "string" && ID.test(value) ? value : null;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const favorites = parseFavorites(body.stores);
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 100) : "";
  const group = optionalId(body.group);
  const sub = optionalId(body.sub);
  const storage = optionalId(body.storage);
  const chain = optionalId(body.chain);
  if (!favorites || group === null || sub === null || storage === null || chain === null) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  if (q.length < 2 && !group) return NextResponse.json({ error: "Scrivi almeno due lettere" }, { status: 400 });

  try {
    return NextResponse.json(await searchCatalog(favorites, { q, group, sub, storage, chain }));
  } catch {
    return NextResponse.json({ error: "Non riesco a cercare nel catalogo, riprova tra poco" }, { status: 500 });
  }
}
