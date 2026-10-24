import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ account: await currentAccount() });
}
