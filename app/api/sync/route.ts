import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { applyFixtureUpdates, getFixtures, saveResults, setAutoEliminated } from "@/lib/db";
import { computeSync, fetchWorldCupMatches, type ApiMatch } from "@/lib/footballData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Accepts: Vercel Cron / external scheduler (Authorization: Bearer CRON_SECRET),
// or a logged-in admin clicking "Sync now".
async function authorize(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  return isAdmin();
}

async function run(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  try {
    // Dev-only: ?sample=1 maps a saved sample payload instead of calling the
    // real API (lets you verify the pipeline without a token).
    const sample = new URL(req.url).searchParams.get("sample");
    let apiMatches: ApiMatch[];
    if (sample && process.env.NODE_ENV !== "production") {
      const file = path.join(process.cwd(), "scripts", "sample-wc-matches.json");
      apiMatches = (JSON.parse(fs.readFileSync(file, "utf8")).matches || []) as ApiMatch[];
    } else {
      apiMatches = await fetchWorldCupMatches();
    }
    const fixtures = await getFixtures();
    const { updates, eliminated, results, unmatched } = computeSync(apiMatches, fixtures);
    await applyFixtureUpdates(updates);
    await setAutoEliminated(eliminated);
    if (results.first || results.second) await saveResults(results);
    return NextResponse.json({
      ok: true,
      matches: apiMatches.length,
      updated: updates.length,
      eliminated: eliminated.length,
      results,
      unmatched,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
