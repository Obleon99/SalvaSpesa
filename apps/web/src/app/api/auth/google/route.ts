import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleConfig } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const config = googleConfig();
  if (!config) return NextResponse.redirect(`${origin}/?auth=google-non-configurato`);
  const state = randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set("ss_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/api/auth/google", maxAge: 600, secure: process.env.NODE_ENV === "production" });
  return response;
}
