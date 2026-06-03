import { FlagImg } from "./FlagImg";
import type { Assignments } from "@/lib/types";

export function GroupsView({
  groups,
  assignments,
  eliminated,
}: {
  groups: Record<string, string[]>;
  assignments: Assignments;
  eliminated: string[];
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
        {Object.entries(groups).map(([g, teams]) => (
          <div className="group-card" key={g}>
            <h3>Group {g}</h3>
            {teams.map((t) => {
              const person = teamToPerson[t];
              const dead = elimSet.has(t);
              return (
                <div className={`group-team${person ? " assigned" : ""}${dead ? " elim" : ""}`} key={t}>
                  <FlagImg team={t} />
                  <span className="tname">{t}</span>
                  {person && <span className="who-tag">{person}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
