"use client";
import { useState } from "react";
import { FlagImg } from "./FlagImg";
import { fmtKickoffUK, kickoffSortKey } from "@/lib/format";
import { scheduledKickoff, venueFor } from "@/lib/venues";
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
  const [hideFinished, setHideFinished] = useState(false);
  const elimSet = new Set(eliminated);
  const assignedSet = new Set(Object.keys(teamToPerson));
  const list = fixtures
    .filter((f) => (!filter || f.group_label === filter) && (!hideFinished || f.status !== "FINISHED"))
    .sort(
      (a, b) =>
        kickoffSortKey(scheduledKickoff(a), a.match_date) - kickoffSortKey(scheduledKickoff(b), b.match_date) ||
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
        <div className="fixtures-controls">
          <label className="toggle">
            <input
              type="checkbox"
              checked={hideFinished}
              onChange={(e) => setHideFinished(e.target.checked)}
            />
            Hide finished
          </label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Groups</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                Group {g}
              </option>
            ))}
          </select>
        </div>
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
              const when = fmtKickoffUK(scheduledKickoff(f), f.match_date);
              return (
                <tr key={f.match_no} className={f.status === "FINISHED" ? "finished" : hl ? "highlight" : ""}>
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
                  <td className="venue-cell">{venueFor(f) || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
