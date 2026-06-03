import type { Metadata } from "next";
import { getTournament } from "@/lib/db";
import { FlagImg } from "@/components/FlagImg";
import { PrizeRace } from "@/components/PrizeRace";
import { GroupsView } from "@/components/GroupsView";
import { Bracket } from "@/components/Bracket";
import { FixturesSection } from "@/components/FixturesSection";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { title } = await getTournament();
    return { title };
  } catch {
    return {};
  }
}

export default async function Home() {
  const t = await getTournament();
  const totalPot = (Number(t.prizes.first) || 0) + (Number(t.prizes.second) || 0);

  const teamToPerson: Record<string, string> = {};
  Object.entries(t.assignments).forEach(([p, teams]) => teams.forEach((tm) => (teamToPerson[tm] = p)));
  const groupFixtures = t.fixtures.filter((f) => f.stage === "GROUP");

  const w1 = t.results.first ? teamToPerson[t.results.first] || null : null;
  const w2 = t.results.second ? teamToPerson[t.results.second] || null : null;

  return (
    <>
      <header>
        <h1>⚽ {t.title}</h1>
        <a className="btn" href="/settings">⚙️ Settings</a>
      </header>
      <main>
        {(t.results.first || t.results.second) && (
          <div className="winners">
            <h2>🏆 Tournament Results</h2>
            {t.results.first && (
              <p>
                🥇 1st: <FlagImg team={t.results.first} /> {t.results.first}
                {w1 ? ` — ${w1}` : ""} {t.prizes.first ? `(£${t.prizes.first})` : ""}
              </p>
            )}
            {t.results.second && (
              <p>
                🥈 2nd: <FlagImg team={t.results.second} /> {t.results.second}
                {w2 ? ` — ${w2}` : ""} {t.prizes.second ? `(£${t.prizes.second})` : ""}
              </p>
            )}
          </div>
        )}

        <div className="card">
          <h2>🏆 Prize Pot</h2>
          <div className="prizes-row">
            <div className="prize-box">
              <div className="label">🥇 1st Place</div>
              <div className="amount">{t.prizes.first ? `£${t.prizes.first}` : "—"}</div>
            </div>
            <div className="prize-box">
              <div className="label">🥈 2nd Place</div>
              <div className="amount">{t.prizes.second ? `£${t.prizes.second}` : "—"}</div>
            </div>
            <div className="prize-box total">
              <div className="label">💰 Total Pot</div>
              <div className="amount">{totalPot ? `£${totalPot}` : "—"}</div>
            </div>
          </div>
        </div>

        <PrizeRace assignments={t.assignments} eliminated={t.eliminated} results={t.results} prizes={t.prizes} />
        <GroupsView groups={t.groups} assignments={t.assignments} eliminated={t.eliminated} />
        <FixturesSection
          fixtures={groupFixtures}
          groups={Object.keys(t.groups)}
          eliminated={t.eliminated}
          teamToPerson={teamToPerson}
        />
        <Bracket fixtures={t.fixtures} eliminated={t.eliminated} />
      </main>
    </>
  );
}
