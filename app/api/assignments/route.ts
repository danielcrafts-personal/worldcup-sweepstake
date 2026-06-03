import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveAssignments } from "@/lib/db";
import { TEAMS } from "@/lib/tournament";
import type { Assignments } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const incoming = (body?.assignments || {}) as Record<string, unknown>;

  const teamSet = new Set(TEAMS);
  const used = new Set<string>();
  const normalised: Assignments = {};
  for (const [person, teams] of Object.entries(incoming)) {
    if (typeof person !== "string" || !person.trim()) {
      return NextResponse.json({ error: "Person name must be a non-empty string." }, { status: 400 });
    }
    const list = Array.isArray(teams) ? teams : [teams];
    for (const team of list) {
      if (typeof team !== "string" || !teamSet.has(team)) {
        return NextResponse.json({ error: `Unknown team: "${team}"` }, { status: 400 });
      }
      if (used.has(team)) {
        return NextResponse.json({ error: `Duplicate team assignment: "${team}"` }, { status: 400 });
      }
      used.add(team);
    }
    normalised[person] = list as string[];
  }

  await saveAssignments(normalised);
  return NextResponse.json({ ok: true, assignments: normalised });
}
