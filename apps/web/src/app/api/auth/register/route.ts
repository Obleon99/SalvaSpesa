import { NextResponse } from "next/server";
import { isAuthError, register, requireJson, tooManyAttempts, validateCredentials } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!requireJson(request)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 415 });
  let body: { email?: unknown; password?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const credentials = validateCredentials(body.email, body.password);
  if (isAuthError(credentials)) return NextResponse.json({ error: credentials.error }, { status: credentials.status });
  if (tooManyAttempts(`register:${request.headers.get("x-forwarded-for") ?? "local"}`)) {
    return NextResponse.json({ error: "Troppi tentativi, riprova tra qualche minuto" }, { status: 429 });
  }
  const account = await register(credentials.email, credentials.password, typeof body.name === "string" ? body.name : "");
  if (isAuthError(account)) return NextResponse.json({ error: account.error }, { status: account.status });
  return NextResponse.json({ account });
}
