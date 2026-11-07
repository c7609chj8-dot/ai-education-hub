import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getAdminAccess();
  const status = access === "unauthenticated" ? 401 : access === "forbidden" ? 403 : 200;
  return NextResponse.json({ authorized: access === "allowed" }, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
