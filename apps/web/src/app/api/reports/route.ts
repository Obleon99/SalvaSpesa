import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REPORTS_FILE = path.resolve(process.cwd(), "../../data/reports.jsonl");

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, max) : null;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const product = text(body.product, 120);
  const seenPrice = typeof body.seenPrice === "number" && Number.isFinite(body.seenPrice) && body.seenPrice > 0 && body.seenPrice < 1000 ? body.seenPrice : null;
  if (!product) return NextResponse.json({ error: "Indica il prodotto" }, { status: 400 });

  const entry = { product, store: text(body.store, 120), seenPrice, note: text(body.note, 300), at: new Date().toISOString() };
  await mkdir(path.dirname(REPORTS_FILE), { recursive: true });
  await appendFile(REPORTS_FILE, `${JSON.stringify(entry)}\n`);
  return NextResponse.json({ ok: true });
}
