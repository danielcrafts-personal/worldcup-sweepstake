// Shared types across the app (frontend + API routes + data layer).

export type Stage = "GROUP" | "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL";
export type FixtureStatus = "SCHEDULED" | "IN_PLAY" | "FINISHED";

export interface Fixture {
  match_no: number;
  stage: Stage;
  group_label: string | null;
  match_date: string | null; // ISO yyyy-mm-dd
  home_slot: string | null; // placeholder label until the team is known
  away_slot: string | null;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  status: FixtureStatus;
  winner: string | null;
  api_match_id: number | null;
}

export interface Prizes {
  first: number;
  second: number;
}
export interface Results {
  first: string | null;
  second: string | null;
}
/** person -> list of team names */
export type Assignments = Record<string, string[]>;

/** The full payload the dashboard renders from. */
export interface TournamentData {
  title: string;
  groups: Record<string, string[]>;
  teams: string[];
  fixtures: Fixture[];
  assignments: Assignments;
  prizes: Prizes;
  results: Results;
  eliminated: string[];
}
