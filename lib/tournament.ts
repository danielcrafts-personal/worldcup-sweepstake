// 2026 FIFA World Cup — static tournament data: groups, teams, group-stage
// fixtures, and the knockout bracket template (matches 73-104 as placeholders).
//
// Knockout slot labels & winner-feed mapping come from the published 2026
// bracket. They are cosmetic placeholders only: once football-data.org reports
// real teams for a knockout match, the sync overwrites home_team/away_team, so
// minor label inaccuracies never affect correctness.
import type { Stage } from "./types";

/** Default site title (editable in Settings, stored in the settings table). */
export const DEFAULT_TITLE = "World Cup 2026 — Family Sweepstake";

export const GROUPS: Record<string, string[]> = {
  A: ["Mexico", "South Africa", "South Korea", "Czechia"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Türkiye"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

export const TEAMS: string[] = Object.values(GROUPS).flat().sort();

export interface FixtureSeed {
  match_no: number;
  stage: Stage;
  group_label: string | null;
  match_date: string | null;
  home_slot: string | null;
  away_slot: string | null;
  home_team: string | null;
  away_team: string | null;
}

// Standard 4-team round-robin matchday pattern (slot indices within a group).
const RR: [number, number][][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [3, 1]],
  [[3, 0], [1, 2]],
];

function dateForGroup(groupIndex: number, matchday: number): string {
  const d = new Date(Date.UTC(2026, 5, 11)); // 11 June 2026
  const dayOffset = Math.floor(groupIndex / 3) + matchday * 5;
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

function groupFixtures(): FixtureSeed[] {
  const out: FixtureSeed[] = [];
  let n = 1;
  Object.keys(GROUPS).forEach((g, gi) => {
    const teams = GROUPS[g];
    RR.forEach((md, mdi) => {
      md.forEach(([a, b]) => {
        out.push({
          match_no: n++,
          stage: "GROUP",
          group_label: g,
          match_date: dateForGroup(gi, mdi),
          home_slot: null,
          away_slot: null,
          home_team: teams[a],
          away_team: teams[b],
        });
      });
    });
  });
  return out; // 72 fixtures, match_no 1..72
}

// Knockout bracket template (matches 73-104). home/away are slot labels.
const KNOCKOUT: { match_no: number; stage: Stage; date: string; home: string; away: string }[] = [
  // Round of 32 (73-88)
  { match_no: 73, stage: "R32", date: "2026-06-28", home: "Runner-up Gp A", away: "Runner-up Gp B" },
  { match_no: 74, stage: "R32", date: "2026-06-28", home: "Winner Gp E", away: "3rd A/B/C/D/F" },
  { match_no: 75, stage: "R32", date: "2026-06-28", home: "Winner Gp F", away: "Runner-up Gp C" },
  { match_no: 76, stage: "R32", date: "2026-06-28", home: "Winner Gp C", away: "Runner-up Gp F" },
  { match_no: 77, stage: "R32", date: "2026-06-29", home: "Winner Gp I", away: "3rd C/D/F/G/H" },
  { match_no: 78, stage: "R32", date: "2026-06-29", home: "Runner-up Gp E", away: "Runner-up Gp I" },
  { match_no: 79, stage: "R32", date: "2026-06-29", home: "Winner Gp A", away: "3rd C/E/F/H/I" },
  { match_no: 80, stage: "R32", date: "2026-06-29", home: "Winner Gp L", away: "3rd E/H/I/J/K" },
  { match_no: 81, stage: "R32", date: "2026-06-30", home: "Winner Gp D", away: "3rd B/E/F/I/J" },
  { match_no: 82, stage: "R32", date: "2026-06-30", home: "Winner Gp G", away: "3rd A/E/H/I/J" },
  { match_no: 83, stage: "R32", date: "2026-06-30", home: "Runner-up Gp K", away: "Runner-up Gp L" },
  { match_no: 84, stage: "R32", date: "2026-06-30", home: "Winner Gp H", away: "Runner-up Gp J" },
  { match_no: 85, stage: "R32", date: "2026-07-01", home: "Winner Gp B", away: "3rd E/F/G/I/J" },
  { match_no: 86, stage: "R32", date: "2026-07-01", home: "Winner Gp J", away: "Runner-up Gp H" },
  { match_no: 87, stage: "R32", date: "2026-07-01", home: "Winner Gp K", away: "3rd D/E/I/J/L" },
  { match_no: 88, stage: "R32", date: "2026-07-01", home: "Runner-up Gp D", away: "Runner-up Gp G" },
  // Round of 16 (89-96)
  { match_no: 89, stage: "R16", date: "2026-07-04", home: "Winner M74", away: "Winner M77" },
  { match_no: 90, stage: "R16", date: "2026-07-04", home: "Winner M73", away: "Winner M75" },
  { match_no: 91, stage: "R16", date: "2026-07-05", home: "Winner M76", away: "Winner M78" },
  { match_no: 92, stage: "R16", date: "2026-07-05", home: "Winner M79", away: "Winner M80" },
  { match_no: 93, stage: "R16", date: "2026-07-06", home: "Winner M83", away: "Winner M84" },
  { match_no: 94, stage: "R16", date: "2026-07-06", home: "Winner M81", away: "Winner M82" },
  { match_no: 95, stage: "R16", date: "2026-07-07", home: "Winner M86", away: "Winner M88" },
  { match_no: 96, stage: "R16", date: "2026-07-07", home: "Winner M85", away: "Winner M87" },
  // Quarter-finals (97-100)
  { match_no: 97, stage: "QF", date: "2026-07-09", home: "Winner M89", away: "Winner M90" },
  { match_no: 98, stage: "QF", date: "2026-07-10", home: "Winner M93", away: "Winner M94" },
  { match_no: 99, stage: "QF", date: "2026-07-11", home: "Winner M91", away: "Winner M92" },
  { match_no: 100, stage: "QF", date: "2026-07-11", home: "Winner M95", away: "Winner M96" },
  // Semi-finals (101-102)
  { match_no: 101, stage: "SF", date: "2026-07-14", home: "Winner M97", away: "Winner M98" },
  { match_no: 102, stage: "SF", date: "2026-07-15", home: "Winner M99", away: "Winner M100" },
  // Third place (103) & Final (104)
  { match_no: 103, stage: "THIRD", date: "2026-07-18", home: "Loser M101", away: "Loser M102" },
  { match_no: 104, stage: "FINAL", date: "2026-07-19", home: "Winner M101", away: "Winner M102" },
];

function knockoutFixtures(): FixtureSeed[] {
  return KNOCKOUT.map((k) => ({
    match_no: k.match_no,
    stage: k.stage,
    group_label: null,
    match_date: k.date,
    home_slot: k.home,
    away_slot: k.away,
    home_team: null,
    away_team: null,
  }));
}

/** All 104 fixtures: 72 real group games + 32 knockout placeholders. */
export function buildFixtureSeeds(): FixtureSeed[] {
  return [...groupFixtures(), ...knockoutFixtures()];
}

export const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  THIRD: "Third place",
  FINAL: "Final",
};

export const KNOCKOUT_STAGES: Stage[] = ["R32", "R16", "QF", "SF", "THIRD", "FINAL"];
