import type { Fixture } from "./types";

export interface StandingRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // goals for
  ga: number; // goals against
  gd: number; // goal difference
  points: number;
}

/** League table for a group, computed from FINISHED fixtures only. Sorted by
 *  points, then goal difference, then goals scored, then name. Recomputed on
 *  every dashboard load, so it updates as results are synced in. */
export function computeGroupStandings(teams: string[], fixtures: Fixture[]): StandingRow[] {
  const table = new Map<string, StandingRow>();
  for (const t of teams) {
    table.set(t, { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
  }

  for (const f of fixtures) {
    if (f.status !== "FINISHED") continue;
    if (f.home_team == null || f.away_team == null || f.home_score == null || f.away_score == null) continue;
    const h = table.get(f.home_team);
    const a = table.get(f.away_team);
    if (!h || !a) continue; // ignore anything not in this group

    h.played++;
    a.played++;
    h.gf += f.home_score;
    h.ga += f.away_score;
    a.gf += f.away_score;
    a.ga += f.home_score;

    if (f.home_score > f.away_score) {
      h.won++;
      h.points += 3;
      a.lost++;
    } else if (f.home_score < f.away_score) {
      a.won++;
      a.points += 3;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
    }
  }

  const rows = [...table.values()];
  for (const r of rows) r.gd = r.gf - r.ga;
  rows.sort(
    (x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf || x.team.localeCompare(y.team)
  );
  return rows;
}
