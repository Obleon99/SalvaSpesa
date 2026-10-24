import { NextResponse } from "next/server";
import { googleConfig } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ enabled: googleConfig() !== null });
}
