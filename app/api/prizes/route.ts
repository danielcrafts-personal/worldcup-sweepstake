import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { savePrizes } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const prizes = { first: Number(body?.first) || 0, second: Number(body?.second) || 0 };
  await savePrizes(prizes);
  return NextResponse.json({ ok: true, prizes });
}
