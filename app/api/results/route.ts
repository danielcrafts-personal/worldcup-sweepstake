import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveResults } from "@/lib/db";
import { TEAMS } from "@/lib/tournament";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const first = body?.first || null;
  const second = body?.second || null;
  const teamSet = new Set(TEAMS);
  if (first && !teamSet.has(first)) return NextResponse.json({ error: `Unknown team: "${first}"` }, { status: 400 });
  if (second && !teamSet.has(second)) return NextResponse.json({ error: `Unknown team: "${second}"` }, { status: 400 });
  if (first && second && first === second) {
    return NextResponse.json({ error: "1st and 2nd place can't be the same team." }, { status: 400 });
  }
  await saveResults({ first, second });
  return NextResponse.json({ ok: true, results: { first, second } });
}
