// Data layer. Two interchangeable backends:
//   - Supabase (Postgres)         — used when SUPABASE_URL is set (production).
//   - Local JSON file (.data)     — dev fallback so the app runs with no setup.
// Static data (groups/teams/bracket) lives in lib/tournament.ts, not the DB.
import fs from "node:fs";
import path from "node:path";
import { hasSupabase, supabaseAdmin } from "./supabase";
import { DEFAULT_TITLE, GROUPS, TEAMS, buildFixtureSeeds, type FixtureSeed } from "./tournament";
import type { Assignments, Fixture, Prizes, Results, TournamentData } from "./types";

export type FixtureUpdate = Partial<Fixture> & { match_no: number };

function seedToFixture(s: FixtureSeed): Fixture {
  return {
    ...s,
    kickoff: null,
    venue: null,
    home_score: null,
    away_score: null,
    status: "SCHEDULED",
    winner: null,
    api_match_id: null,
  };
}

/** Read the legacy Express store.json (if present) to migrate initial data. */
function legacyData(): { assignments: Assignments; prizes: Prizes } {
  const empty = { assignments: {} as Assignments, prizes: { first: 0, second: 0 } };
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "store.json"), "utf8"));
    const assignments: Assignments = {};
    for (const [person, teams] of Object.entries(raw.assignments || {})) {
      assignments[person] = Array.isArray(teams) ? (teams as string[]) : [teams as string];
    }
    return { assignments, prizes: { first: Number(raw.prizes?.first) || 0, second: Number(raw.prizes?.second) || 0 } };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Dev JSON-file backend
// ---------------------------------------------------------------------------
interface DevStore {
  title?: string;
  fixtures: Fixture[];
  assignments: Assignments;
  prizes: Prizes;
  results: Results;
  eliminated: { team: string; manual: boolean }[];
}
const DEV_FILE = path.join(process.cwd(), ".data", "store.json");

function devRead(): DevStore {
  // The JSON-file fallback is local-dev only. On Vercel the filesystem is
  // read-only, so missing Supabase config must surface as a clear message.
  if (process.env.VERCEL) {
    throw new Error(
      "Database not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then redeploy."
    );
  }
  try {
    return JSON.parse(fs.readFileSync(DEV_FILE, "utf8"));
  } catch {
    const legacy = legacyData();
    const store: DevStore = {
      title: DEFAULT_TITLE,
      fixtures: buildFixtureSeeds().map(seedToFixture),
      assignments: legacy.assignments,
      prizes: legacy.prizes,
      results: { first: null, second: null },
      eliminated: [],
    };
    devWrite(store);
    return store;
  }
}
function devWrite(store: DevStore): void {
  fs.mkdirSync(path.dirname(DEV_FILE), { recursive: true });
  fs.writeFileSync(DEV_FILE, JSON.stringify(store, null, 2));
}

// ---------------------------------------------------------------------------
// Public API (backend-agnostic)
// ---------------------------------------------------------------------------
export async function getFixtures(): Promise<Fixture[]> {
  if (!hasSupabase()) return devRead().fixtures.slice().sort((a, b) => a.match_no - b.match_no);
  const { data, error } = await supabaseAdmin().from("fixtures").select("*").order("match_no");
  if (error) throw error;
  return (data || []) as Fixture[];
}

export async function getTournament(): Promise<TournamentData> {
  const base = { groups: GROUPS, teams: TEAMS };
  if (!hasSupabase()) {
    const s = devRead();
    return {
      ...base,
      title: s.title || DEFAULT_TITLE,
      fixtures: s.fixtures.slice().sort((a, b) => a.match_no - b.match_no),
      assignments: s.assignments,
      prizes: s.prizes,
      results: s.results,
      eliminated: s.eliminated.map((e) => e.team),
    };
  }
  const sb = supabaseAdmin();
  const [fx, asg, set, elim] = await Promise.all([
    sb.from("fixtures").select("*").order("match_no"),
    sb.from("assignments").select("person, team"),
    sb.from("settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("eliminated").select("team"),
  ]);
  if (fx.error) throw fx.error;
  const assignments: Assignments = {};
  for (const row of asg.data || []) {
    (assignments[row.person] ||= []).push(row.team);
  }
  return {
    ...base,
    title: set.data?.site_title || DEFAULT_TITLE,
    fixtures: (fx.data || []) as Fixture[],
    assignments,
    prizes: { first: Number(set.data?.prize_first) || 0, second: Number(set.data?.prize_second) || 0 },
    results: { first: set.data?.result_first ?? null, second: set.data?.result_second ?? null },
    eliminated: (elim.data || []).map((r) => r.team),
  };
}

export async function saveAssignments(a: Assignments): Promise<void> {
  if (!hasSupabase()) {
    const s = devRead();
    s.assignments = a;
    devWrite(s);
    return;
  }
  const sb = supabaseAdmin();
  await sb.from("assignments").delete().gte("id", 0);
  const rows = Object.entries(a).flatMap(([person, teams]) => teams.map((team) => ({ person, team })));
  if (rows.length) {
    const { error } = await sb.from("assignments").insert(rows);
    if (error) throw error;
  }
}

async function ensureSettingsRow(): Promise<void> {
  await supabaseAdmin().from("settings").upsert({ id: 1 }, { onConflict: "id", ignoreDuplicates: true });
}

export async function savePrizes(p: Prizes): Promise<void> {
  if (!hasSupabase()) {
    const s = devRead();
    s.prizes = { first: Number(p.first) || 0, second: Number(p.second) || 0 };
    devWrite(s);
    return;
  }
  await ensureSettingsRow();
  const { error } = await supabaseAdmin()
    .from("settings")
    .update({ prize_first: Number(p.first) || 0, prize_second: Number(p.second) || 0 })
    .eq("id", 1);
  if (error) throw error;
}

export async function saveTitle(title: string): Promise<string> {
  const clean = (title || "").trim().slice(0, 120) || DEFAULT_TITLE;
  if (!hasSupabase()) {
    const s = devRead();
    s.title = clean;
    devWrite(s);
    return clean;
  }
  await ensureSettingsRow();
  const { error } = await supabaseAdmin().from("settings").update({ site_title: clean }).eq("id", 1);
  if (error) throw error;
  return clean;
}

export async function saveResults(r: Results): Promise<void> {
  if (!hasSupabase()) {
    const s = devRead();
    s.results = { first: r.first || null, second: r.second || null };
    devWrite(s);
    return;
  }
  await ensureSettingsRow();
  const { error } = await supabaseAdmin()
    .from("settings")
    .update({ result_first: r.first || null, result_second: r.second || null })
    .eq("id", 1);
  if (error) throw error;
}

/** Admin-set eliminations (replaces the manual set, keeps auto rows). */
export async function setManualEliminated(teams: string[]): Promise<void> {
  if (!hasSupabase()) {
    const s = devRead();
    const auto = s.eliminated.filter((e) => !e.manual);
    const manual = teams.map((team) => ({ team, manual: true }));
    const seen = new Set(manual.map((m) => m.team));
    s.eliminated = [...manual, ...auto.filter((a) => !seen.has(a.team))];
    devWrite(s);
    return;
  }
  const sb = supabaseAdmin();
  await sb.from("eliminated").delete().eq("manual", true);
  if (teams.length) {
    const { error } = await sb.from("eliminated").upsert(
      teams.map((team) => ({ team, manual: true })),
      { onConflict: "team" }
    );
    if (error) throw error;
  }
}

/** Sync-derived eliminations (replaces the auto set, keeps manual rows). */
export async function setAutoEliminated(teams: string[]): Promise<void> {
  if (!hasSupabase()) {
    const s = devRead();
    const manual = s.eliminated.filter((e) => e.manual);
    const manualSet = new Set(manual.map((m) => m.team));
    const auto = teams.filter((t) => !manualSet.has(t)).map((team) => ({ team, manual: false }));
    s.eliminated = [...manual, ...auto];
    devWrite(s);
    return;
  }
  const sb = supabaseAdmin();
  await sb.from("eliminated").delete().eq("manual", false);
  const { data: man } = await sb.from("eliminated").select("team").eq("manual", true);
  const manualSet = new Set((man || []).map((r) => r.team));
  const rows = teams.filter((t) => !manualSet.has(t)).map((team) => ({ team, manual: false }));
  if (rows.length) {
    const { error } = await sb.from("eliminated").insert(rows);
    if (error) throw error;
  }
}

export async function applyFixtureUpdates(updates: FixtureUpdate[]): Promise<void> {
  if (updates.length === 0) return;
  if (!hasSupabase()) {
    const s = devRead();
    const byNo = new Map(s.fixtures.map((f) => [f.match_no, f]));
    for (const u of updates) {
      const cur = byNo.get(u.match_no);
      if (cur) Object.assign(cur, u);
    }
    devWrite(s);
    return;
  }
  const sb = supabaseAdmin();
  for (const { match_no, ...fields } of updates) {
    const { error } = await sb
      .from("fixtures")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("match_no", match_no);
    if (error) throw error;
  }
}

/** Idempotent seed: populate the 104 fixtures if empty, and migrate legacy
 *  assignments/prizes on first run. Safe to call repeatedly. */
export async function seedFixtures(): Promise<{ seeded: number }> {
  const seeds = buildFixtureSeeds();
  if (!hasSupabase()) {
    devRead(); // initialises the dev store (incl. fixtures + legacy migration)
    return { seeded: seeds.length };
  }
  const sb = supabaseAdmin();
  const { count } = await sb.from("fixtures").select("match_no", { count: "exact", head: true });
  if ((count || 0) === 0) {
    const { error } = await sb.from("fixtures").insert(seeds.map(seedToFixture));
    if (error) throw error;
  }
  const { count: aCount } = await sb.from("assignments").select("id", { count: "exact", head: true });
  if ((aCount || 0) === 0) {
    const legacy = legacyData();
    if (Object.keys(legacy.assignments).length) await saveAssignments(legacy.assignments);
    if (legacy.prizes.first || legacy.prizes.second) await savePrizes(legacy.prizes);
  }
  return { seeded: seeds.length };
}
