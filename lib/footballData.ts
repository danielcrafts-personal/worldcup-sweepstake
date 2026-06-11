// football-data.org integration: fetch World Cup matches and map them onto our
// fixtures. Mapping/derivation are pure functions so they can be unit-tested
// against a saved sample payload (see scripts/test-sync.mjs).
//
// CAVEAT: the exact `stage` strings and team-name spellings for the 48-team
// format must be confirmed against a live response. STAGE_MAP and NAME_MAP are
// written defensively (multiple aliases) and are easy to extend.
import { TEAMS } from "./tournament";
import type { Fixture, FixtureStatus, Results, Stage } from "./types";
import type { FixtureUpdate } from "./db";

const API_BASE = "https://api.football-data.org/v4";

export interface ApiTeam { id: number | null; name: string | null; tla?: string | null; }
export interface ApiMatch {
  id: number;
  utcDate: string;
  venue?: string | null;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration?: string;
    fullTime: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
}

const STAGE_MAP: Record<string, Stage> = {
  GROUP_STAGE: "GROUP",
  LAST_32: "R32", ROUND_OF_32: "R32",
  LAST_16: "R16", ROUND_OF_16: "R16",
  QUARTER_FINAL: "QF", QUARTER_FINALS: "QF",
  SEMI_FINAL: "SF", SEMI_FINALS: "SF",
  THIRD_PLACE: "THIRD", "3RD_PLACE_FINAL": "THIRD", PLAY_OFF_FOR_THIRD_PLACE: "THIRD",
  FINAL: "FINAL",
};

// football-data.org spelling -> our team name (only the ones that differ).
const NAME_MAP: Record<string, string> = {
  "Korea Republic": "South Korea", "Republic of Korea": "South Korea", "South Korea": "South Korea",
  Turkey: "Türkiye", "Türkiye": "Türkiye",
  "Czech Republic": "Czechia", Czechia: "Czechia",
  "Côte d'Ivoire": "Ivory Coast", "Cote d'Ivoire": "Ivory Coast", "Ivory Coast": "Ivory Coast",
  USA: "United States", "United States": "United States", "United States of America": "United States",
  "IR Iran": "Iran", Iran: "Iran",
  "Congo DR": "DR Congo", "DR Congo": "DR Congo", "Democratic Republic of the Congo": "DR Congo",
  "Cabo Verde": "Cape Verde", "Cape Verde": "Cape Verde",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina", "Bosnia and Herzegovina": "Bosnia and Herzegovina",
};

const TEAM_SET = new Set(TEAMS);

export function normalizeTeam(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = name.trim();
  if (NAME_MAP[n]) return NAME_MAP[n];
  if (TEAM_SET.has(n)) return n;
  return n; // unknown spelling — keep it so it still displays; extend NAME_MAP
}

function mapStatus(s: string): FixtureStatus {
  if (s === "IN_PLAY" || s === "PAUSED" || s === "SUSPENDED") return "IN_PLAY";
  if (s === "FINISHED" || s === "AWARDED") return "FINISHED";
  return "SCHEDULED";
}

function winnerOf(home: string | null, away: string | null, m: ApiMatch): string | null {
  if (m.score?.winner === "HOME_TEAM") return home;
  if (m.score?.winner === "AWAY_TEAM") return away;
  // Knockout draw decided on penalties:
  const pen = m.score?.penalties;
  if (pen && pen.home != null && pen.away != null && pen.home !== pen.away) {
    return pen.home > pen.away ? home : away;
  }
  return null;
}

function buildUpdate(fixture: Fixture, m: ApiMatch): FixtureUpdate {
  const home = normalizeTeam(m.homeTeam?.name);
  const away = normalizeTeam(m.awayTeam?.name);
  const status = mapStatus(m.status);
  return {
    match_no: fixture.match_no,
    api_match_id: m.id,
    kickoff: m.utcDate ?? null,
    venue: m.venue ?? null,
    home_team: home ?? fixture.home_team,
    away_team: away ?? fixture.away_team,
    home_score: m.score?.fullTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? null,
    status,
    winner: status === "FINISHED" ? winnerOf(home, away, m) : null,
  };
}

function sameTeams(f: Fixture, home: string | null, away: string | null): boolean {
  const a = new Set([f.home_team, f.away_team]);
  return a.has(home) && a.has(away) && home !== null && away !== null;
}

/** Pure: produce fixture updates from API matches given our current fixtures. */
export function mapApiToFixtureUpdates(apiMatches: ApiMatch[], fixtures: Fixture[]): FixtureUpdate[] {
  const updates: FixtureUpdate[] = [];
  const usedFixtureNos = new Set<number>();
  const byApiId = new Map<number, Fixture>();
  fixtures.forEach((f) => { if (f.api_match_id != null) byApiId.set(f.api_match_id, f); });

  const leftoverKO: ApiMatch[] = [];

  for (const m of apiMatches) {
    const stage = STAGE_MAP[m.stage];
    if (!stage) continue;

    // 1) Already linked by API id (stable across syncs).
    const linked = byApiId.get(m.id);
    if (linked) {
      updates.push(buildUpdate(linked, m));
      usedFixtureNos.add(linked.match_no);
      continue;
    }
    // 2) Group games: match by team-set.
    if (stage === "GROUP") {
      const home = normalizeTeam(m.homeTeam?.name);
      const away = normalizeTeam(m.awayTeam?.name);
      const target = fixtures.find(
        (f) => f.stage === "GROUP" && !usedFixtureNos.has(f.match_no) && sameTeams(f, home, away)
      );
      if (target) {
        updates.push(buildUpdate(target, m));
        usedFixtureNos.add(target.match_no);
      }
      continue;
    }
    // 3) Knockout, not yet linked → resolve by ordered pairing below.
    leftoverKO.push(m);
  }

  // Ordered pairing per knockout stage: API matches (by date) ↔ our fixtures (by match_no).
  const koStages: Stage[] = ["R32", "R16", "QF", "SF", "THIRD", "FINAL"];
  for (const st of koStages) {
    const apiOfStage = leftoverKO
      .filter((m) => STAGE_MAP[m.stage] === st)
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
    const ourOfStage = fixtures
      .filter((f) => f.stage === st && !usedFixtureNos.has(f.match_no) && f.api_match_id == null)
      .sort((a, b) => a.match_no - b.match_no);
    apiOfStage.forEach((m, i) => {
      const target = ourOfStage[i];
      if (target) {
        updates.push(buildUpdate(target, m));
        usedFixtureNos.add(target.match_no);
      }
    });
  }

  return updates;
}

/** Apply updates onto a copy of fixtures (used by derive* on the new state). */
function withUpdates(fixtures: Fixture[], updates: FixtureUpdate[]): Fixture[] {
  const byNo = new Map(fixtures.map((f) => [f.match_no, { ...f }]));
  for (const u of updates) {
    const cur = byNo.get(u.match_no);
    if (cur) Object.assign(cur, u);
  }
  return [...byNo.values()];
}

/** Teams knocked out: losers of finished knockout games + (once the Round of
 *  32 is fully populated) any team that didn't reach it. */
export function deriveEliminated(fixtures: Fixture[]): string[] {
  const elim = new Set<string>();
  for (const f of fixtures) {
    if (f.stage !== "GROUP" && f.status === "FINISHED" && f.winner) {
      const loser = [f.home_team, f.away_team].find((t) => t && t !== f.winner);
      if (loser) elim.add(loser);
    }
  }
  const r32 = fixtures.filter((f) => f.stage === "R32");
  const fullyPopulated = r32.length === 16 && r32.every((f) => f.home_team && f.away_team);
  if (fullyPopulated) {
    const inR32 = new Set<string>();
    r32.forEach((f) => { if (f.home_team) inR32.add(f.home_team); if (f.away_team) inR32.add(f.away_team); });
    for (const t of TEAMS) if (!inR32.has(t)) elim.add(t);
  }
  return [...elim];
}

/** Final result once match 104 is finished. */
export function deriveResults(fixtures: Fixture[]): Results {
  const final = fixtures.find((f) => f.match_no === 104);
  if (final && final.status === "FINISHED" && final.winner) {
    const runnerUp = [final.home_team, final.away_team].find((t) => t && t !== final.winner) || null;
    return { first: final.winner, second: runnerUp };
  }
  return { first: null, second: null };
}

/** Convenience for /api/sync and the sample test. */
export function computeSync(apiMatches: ApiMatch[], fixtures: Fixture[]) {
  const updates = mapApiToFixtureUpdates(apiMatches, fixtures);
  const next = withUpdates(fixtures, updates);
  return { updates, eliminated: deriveEliminated(next), results: deriveResults(next) };
}

export async function fetchWorldCupMatches(): Promise<ApiMatch[]> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_TOKEN is not set");
  const comp = process.env.FOOTBALL_DATA_COMPETITION || "WC";
  const res = await fetch(`${API_BASE}/competitions/${comp}/matches`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`football-data.org ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as { matches?: ApiMatch[] };
  return data.matches || [];
}
