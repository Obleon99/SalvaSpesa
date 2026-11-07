import { NextResponse } from "next/server";
import { currentAccount, loadAccountState, requireJson, saveAccountState, updateAccountName } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Non hai effettuato l'accesso" }, { status: 401 });
  return NextResponse.json({ state: await loadAccountState(account.id) });
}

export async function PUT(request: Request) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Non hai effettuato l'accesso" }, { status: 401 });
  if (!requireJson(request)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 415 });
  let body: { state?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const state = body.state;
  if (typeof state !== "object" || state === null || Array.isArray(state)) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  if (!(await saveAccountState(account.id, state))) return NextResponse.json({ error: "Dati troppo grandi" }, { status: 413 });
  const name = (state as { profile?: { name?: unknown } }).profile?.name;
  if (typeof name === "string") await updateAccountName(account.id, name.trim());
  return NextResponse.json({ ok: true });
}
