import { FlagImg } from "./FlagImg";
import { fmtKickoffUK } from "@/lib/format";
import { venueFor } from "@/lib/venues";
import { KNOCKOUT_STAGES, STAGE_LABELS } from "@/lib/tournament";
import type { Fixture } from "@/lib/types";

function Side({ team, slot, win, score, dim, person }: {
  team: string | null; slot: string | null; win: boolean; score: number | null; dim: boolean; person?: string;
}) {
  return (
    <div className={`ko-side${win ? " win" : ""}`} style={dim ? { opacity: 0.5 } : undefined}>
      {team ? (
        <>
          <FlagImg team={team} />
          <span className="tname">{team}</span>
          {person && <span className="who-tag">{person}</span>}
        </>
      ) : (
        <span className="slot">{slot}</span>
      )}
      {score != null && <span className="score">{score}</span>}
    </div>
  );
}

export function Bracket({
  fixtures,
  teamToPerson,
}: {
  fixtures: Fixture[];
  teamToPerson: Record<string, string>;
}) {
  const ko = fixtures.filter((f) => f.stage !== "GROUP");
  if (!ko.length) return null;

  return (
    <div className="card">
      <h2>🏆 Knockout Bracket</h2>
      <div className="bracket-stages">
        {KNOCKOUT_STAGES.map((stage) => {
          const matches = ko.filter((f) => f.stage === stage).sort((a, b) => a.match_no - b.match_no);
          if (!matches.length) return null;
          return (
            <section className="bracket-stage" key={stage}>
              <h3>
                {STAGE_LABELS[stage]} <span className="stage-count">{matches.length}</span>
              </h3>
              <div className="bracket-grid">
              {matches.map((m) => {
                const showScore = m.status !== "SCHEDULED" && m.home_score != null;
                const homeLost = m.status === "FINISHED" && m.winner != null && m.home_team != null && m.winner !== m.home_team;
                const awayLost = m.status === "FINISHED" && m.winner != null && m.away_team != null && m.winner !== m.away_team;
                const k = fmtKickoffUK(m.kickoff, m.match_date);
                const venue = venueFor(m);
                return (
                  <div className="ko-match" key={m.match_no}>
                    <div className="ko-date">
                      {k.date}
                      {k.time ? ` · ${k.time}` : ""} · M{m.match_no}
                    </div>
                    {venue && <div className="ko-venue">📍 {venue}</div>}
                    <Side team={m.home_team} slot={m.home_slot} win={m.winner != null && m.winner === m.home_team}
                          score={showScore ? m.home_score : null} dim={homeLost}
                          person={m.home_team ? teamToPerson[m.home_team] : undefined} />
                    <Side team={m.away_team} slot={m.away_slot} win={m.winner != null && m.winner === m.away_team}
                          score={showScore ? m.away_score : null} dim={awayLost}
                          person={m.away_team ? teamToPerson[m.away_team] : undefined} />
                    {m.status === "IN_PLAY" && <div className="ko-status live">● Live</div>}
                    {m.status === "FINISHED" && m.winner && <div className="ko-status">{m.winner} advance</div>}
                  </div>
                );
              })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
