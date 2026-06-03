import { NextResponse } from "next/server";
import { checkPassword, isAdmin } from "@/lib/auth";
import { seedFixtures } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Idempotent: seeds the 104 fixtures if empty and migrates legacy assignments/
// prizes on first run. Authorized by admin cookie or the admin password in body
// (handy for a one-off curl after deploy).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!(await isAdmin()) && !checkPassword(body?.password)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  try {
    const result = await seedFixtures();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
