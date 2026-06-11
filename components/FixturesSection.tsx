"use client";
import { useState } from "react";
import { FlagImg } from "./FlagImg";
import { fmtKickoffUK, kickoffSortKey } from "@/lib/format";
import type { Fixture } from "@/lib/types";

export function FixturesSection({
  fixtures,
  groups,
  eliminated,
  teamToPerson,
}: {
  fixtures: Fixture[];
  groups: string[];
  eliminated: string[];
  teamToPerson: Record<string, string>;
}) {
  const [filter, setFilter] = useState("");
  const elimSet = new Set(eliminated);
  const assignedSet = new Set(Object.keys(teamToPerson));
  const list = (filter ? fixtures.filter((f) => f.group_label === filter) : fixtures)
    .slice()
    .sort(
      (a, b) =>
        kickoffSortKey(a.kickoff, a.match_date) - kickoffSortKey(b.kickoff, b.match_date) ||
        a.match_no - b.match_no
    );

  const teamCell = (team: string | null) => {
    const person = team ? teamToPerson[team] : undefined;
    return (
      <div className={`cell-team${team && elimSet.has(team) ? " elim" : ""}`}>
        <FlagImg team={team} />
        <span className="tname">{team}</span>
        {person && <span className="who-tag">{person}</span>}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="fixtures-header">
        <h2>📅 Group Fixtures</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Groups</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              Group {g}
            </option>
          ))}
        </select>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>When (UK)</th>
              <th>Grp</th>
              <th>Home</th>
              <th></th>
              <th>Away</th>
              <th>Venue</th>
            </tr>
          </thead>
          <tbody>
            {list.map((f) => {
              const hl =
                (f.home_team && assignedSet.has(f.home_team)) ||
                (f.away_team && assignedSet.has(f.away_team));
              const score =
                f.status !== "SCHEDULED" && f.home_score != null
                  ? `${f.home_score}–${f.away_score}`
                  : "vs";
              const when = fmtKickoffUK(f.kickoff, f.match_date);
              return (
                <tr key={f.match_no} className={hl ? "highlight" : ""}>
                  <td>
                    <div className="when-date">{when.date}</div>
                    {when.time && <div className="when-time">{when.time}</div>}
                  </td>
                  <td>
                    <span className="group-pill">{f.group_label}</span>
                  </td>
                  <td>{teamCell(f.home_team)}</td>
                  <td className="score-cell">{score}</td>
                  <td>{teamCell(f.away_team)}</td>
                  <td className="venue-cell">{f.venue || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
