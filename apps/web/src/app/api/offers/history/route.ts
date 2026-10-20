import { NextResponse } from "next/server";
import { getHistory, SUPPORTED_CHAINS } from "@/lib/offers-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chain = searchParams.get("chain") ?? "";
  const id = searchParams.get("id") ?? "";
  const store = searchParams.get("store") ?? undefined;

  if (!SUPPORTED_CHAINS.has(chain) || !/^[\w-]{1,40}$/.test(id) || (store !== undefined && !/^[A-Z0-9]{2,6}$/.test(store))) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }
  return NextResponse.json({ points: await getHistory(chain, id, store) });
}
