import type { ReactNode } from "react";
import { FlagImg } from "./FlagImg";
import type { Assignments, Prizes, Results } from "@/lib/types";

export function PrizeRace({
  assignments,
  eliminated,
  results,
  prizes,
}: {
  assignments: Assignments;
  eliminated: string[];
  results: Results;
  prizes: Prizes;
}) {
  const elimSet = new Set(eliminated);
  const totalPot = (Number(prizes.first) || 0) + (Number(prizes.second) || 0);
  const entries = Object.entries(assignments);

  if (entries.length === 0) {
    return (
      <div className="card">
        <h2>🎯 Prize Race — Who&apos;s Still In</h2>
        <p style={{ opacity: 0.6 }}>No assignments yet — use Settings to add them.</p>
      </div>
    );
  }

  let stillInCount = 0;
  const cards = entries.map(([person, teams]) => {
    const list = Array.isArray(teams) ? teams : [teams];
    const active = list.filter((t) => !elimSet.has(t));
    const stillIn = active.length > 0;
    if (stillIn) stillInCount++;
    const won1 = Boolean(results.first && list.includes(results.first));
    const won2 = Boolean(results.second && list.includes(results.second));

    let pill: ReactNode;
    let cls: string;
    if (won1) { pill = <span className="pill gold">🥇 Winner</span>; cls = "gold"; }
    else if (won2) { pill = <span className="pill silver">🥈 Runner-up</span>; cls = "silver"; }
    else if (stillIn) { pill = <span className="pill in">✓ Still In</span>; cls = "in"; }
    else { pill = <span className="pill out">✗ Knocked Out</span>; cls = "out"; }

    return (
      <div className={`standing ${cls}`} key={person}>
        <div className="top">
          <span className="who">{person}</span>
          {pill}
        </div>
        {list.map((t) => {
          const dead = elimSet.has(t);
          return (
            <div className={`teamrow${dead ? " elim" : ""}`} key={t}>
              <FlagImg team={t} />
              <span className="tname">{t}</span>
              {dead && <span className="ko">OUT</span>}
            </div>
          );
        })}
        <div className="count">
          {active.length} of {list.length} team{list.length > 1 ? "s" : ""} still in
        </div>
      </div>
    );
  });

  return (
    <div className="card">
      <h2>
        🎯 Prize Race — Who&apos;s Still In
        <span className="sub">
          {stillInCount}/{entries.length} still alive
        </span>
      </h2>
      <div className="race-summary">
        {eliminated.length === 0 ? (
          <>
            🟢 The tournament&apos;s just getting started — all <b>{entries.length}</b> still in the running
            {totalPot ? (
              <>
                {" "}
                for the <b>£{totalPot}</b> pot
              </>
            ) : null}
            .
          </>
        ) : (
          <>
            <b>{stillInCount}</b> of <b>{entries.length}</b> still in the running
            {totalPot ? (
              <>
                {" "}
                for the <b>£{totalPot}</b> pot
              </>
            ) : null}{" "}
            · <b>{eliminated.length}</b> team{eliminated.length > 1 ? "s" : ""} knocked out.
          </>
        )}
      </div>
      <div className="standing-grid">{cards}</div>
    </div>
  );
}
