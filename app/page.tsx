import type { Metadata } from "next";
import { getTournament } from "@/lib/db";
import { FlagImg } from "@/components/FlagImg";
import { PrizeRace } from "@/components/PrizeRace";
import { GroupsView } from "@/components/GroupsView";
import { Bracket } from "@/components/Bracket";
import { FixturesSection } from "@/components/FixturesSection";
import { VisitTracker } from "@/components/VisitTracker";
import type { TournamentData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { title } = await getTournament();
    return { title };
  } catch {
    return {};
  }
}

function SetupNeeded({ message }: { message: string }) {
  return (
    <>
      <header>
        <h1>⚽ World Cup 2026 — Family Sweepstake</h1>
      </header>
      <main>
        <div className="card" style={{ maxWidth: 660, margin: "24px auto" }}>
          <h2>⚠️ Setup needed</h2>
          <p className="hint">The dashboard could not load its data — the database is not ready yet. Server said:</p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#0a3528",
              border: "1px solid #15543f",
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
              color: "#ffd9d9",
              margin: "10px 0",
            }}
          >
            {message}
          </pre>
          <ol style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 18 }}>
            <li>
              In Vercel → Settings → Environment Variables, confirm <code>SUPABASE_URL</code> and{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> are set, then redeploy.
            </li>
            <li>
              In Supabase → SQL Editor, run <code>supabase/schema.sql</code>.
            </li>
            <li>
              Seed once: <code>POST /api/seed</code> with your admin password (see <code>SETUP.md</code>).
            </li>
          </ol>
        </div>
      </main>
    </>
  );
}

export default async function Home() {
  let t: TournamentData;
  try {
    t = await getTournament();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[dashboard] failed to load tournament data:", message);
    return <SetupNeeded message={message} />;
  }
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
        <VisitTracker />
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
