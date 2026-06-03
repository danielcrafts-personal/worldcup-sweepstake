import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveTitle } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = await saveTitle(typeof body?.title === "string" ? body.title : "");
  return NextResponse.json({ ok: true, title });
}
