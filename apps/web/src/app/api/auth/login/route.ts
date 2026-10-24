import { NextResponse } from "next/server";
import { clearAttempts, isAuthError, login, requireJson, tooManyAttempts, validateCredentials } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!requireJson(request)) return NextResponse.json({ error: "Richiesta non valida" }, { status: 415 });
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const credentials = validateCredentials(body.email, body.password);
  if (isAuthError(credentials)) return NextResponse.json({ error: "Email o password non corrette" }, { status: 401 });
  const key = `login:${request.headers.get("x-forwarded-for") ?? "local"}:${credentials.email}`;
  if (tooManyAttempts(key)) return NextResponse.json({ error: "Troppi tentativi, riprova tra qualche minuto" }, { status: 429 });
  const account = await login(credentials.email, credentials.password);
  if (isAuthError(account)) return NextResponse.json({ error: account.error }, { status: account.status });
  clearAttempts(key);
  return NextResponse.json({ account });
}
