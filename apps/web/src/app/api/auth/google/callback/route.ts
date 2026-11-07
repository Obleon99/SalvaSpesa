import { NextResponse } from "next/server";
import { googleConfig, loginWithGoogle } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const fail = (reason: string) => NextResponse.redirect(`${origin}/?auth=${reason}`);
  const config = googleConfig();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = request.headers.get("cookie")?.match(/(?:^|;\s*)ss_oauth_state=([^;]+)/)?.[1];
  if (!config || !code || !state || state !== expected) return fail("google-errore");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) return fail("google-errore");
    const { id_token: idToken } = (await tokenResponse.json()) as { id_token?: string };
    if (!idToken) return fail("google-errore");
    // Il token arriva direttamente da Google via HTTPS: se ne legge il contenuto senza ricontrollare la firma.
    const claims = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
      aud?: string;
    };
    if (!claims.email || claims.email_verified !== true || claims.aud !== config.clientId) return fail("google-errore");
    await loginWithGoogle(claims.email, claims.name ?? "");
  } catch {
    return fail("google-errore");
  }
  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.delete("ss_oauth_state");
  return response;
}
