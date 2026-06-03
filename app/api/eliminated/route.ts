import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { setManualEliminated } from "@/lib/db";
import { TEAMS } from "@/lib/tournament";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const incoming = Array.isArray(body?.eliminated) ? body.eliminated : [];
  const teamSet = new Set(TEAMS);
  const clean: string[] = [];
  for (const team of incoming) {
    if (typeof team !== "string" || !teamSet.has(team)) {
      return NextResponse.json({ error: `Unknown team: "${team}"` }, { status: 400 });
    }
    if (!clean.includes(team)) clean.push(team);
  }
  await setManualEliminated(clean);
  return NextResponse.json({ ok: true, eliminated: clean });
}
