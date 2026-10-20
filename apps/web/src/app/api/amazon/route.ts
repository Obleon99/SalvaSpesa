import { NextResponse } from "next/server";
import { searchAmazon } from "@/lib/amazon";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ error: "Ricerca non valida" }, { status: 400 });
  }
  return NextResponse.json(await searchAmazon(query));
}
