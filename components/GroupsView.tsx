import { FlagImg } from "./FlagImg";
import { computeGroupStandings } from "@/lib/standings";
import type { Assignments, Fixture } from "@/lib/types";

export function GroupsView({
  groups,
  assignments,
  eliminated,
  fixtures,
}: {
  groups: Record<string, string[]>;
  assignments: Assignments;
  eliminated: string[];
  fixtures: Fixture[];
}) {
  const elimSet = new Set(eliminated);
  const teamToPerson: Record<string, string> = {};
  Object.entries(assignments).forEach(([p, teams]) =>
    (Array.isArray(teams) ? teams : [teams]).forEach((t) => (teamToPerson[t] = p))
  );

  return (
    <div className="card">
      <h2>🌍 Groups</h2>
      <div className="groups-grid">
        {Object.entries(groups).map(([g, teams]) => {
          const rows = computeGroupStandings(
            teams,
            fixtures.filter((f) => f.group_label === g)
          );
          return (
            <div className="group-card" key={g}>
              <h3>Group {g}</h3>
              <table className="standings">
                <thead>
                  <tr>
                    <th className="st-team-h">Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const person = teamToPerson[r.team];
                    const dead = elimSet.has(r.team);
                    return (
                      <tr key={r.team} className={dead ? "elim" : ""}>
                        <td className="st-team">
                          <FlagImg team={r.team} />
                          <span className="tname">{r.team}</span>
                          {person && <span className="who-tag">{person}</span>}
                        </td>
                        <td>{r.played}</td>
                        <td>{r.won}</td>
                        <td>{r.drawn}</td>
                        <td>{r.lost}</td>
                        <td className="pts">{r.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
