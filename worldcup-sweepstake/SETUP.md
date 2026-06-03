# World Cup 2026 Family Sweepstake — Setup

Next.js app (Vercel) + Supabase (Postgres) + live data from **football-data.org**.

- **Dashboard** (`/`): prize pot, "Prize Race — Who's Still In", groups, the full
  **knockout bracket** (placeholders that fill in as teams advance), and group fixtures.
- **Settings** (`/settings`, password-protected): assignments, prizes, manual
  results/knockout overrides, and a **Sync now** button.
- A scheduled job pulls fixtures/scores from football-data.org and auto-fills the
  bracket, derives who's eliminated, and sets the final result.

---

## 1. Run locally (no accounts needed)

```bash
npm install
npm run dev          # http://localhost:3000
```

With no `SUPABASE_URL` set, the app uses a local JSON file at `.data/store.json`
(auto-created, seeded with all 104 fixtures + any data migrated from `store.json`).
Default admin password is `changeme`.

**Test the live-sync pipeline without an API token** (dev only):

```bash
# /api/sync needs admin (cookie) OR the CRON_SECRET bearer token.
# Easiest: open /settings, log in, click "Sync now".
# Or from the CLI using the dev CRON_SECRET from .env.example:
curl -X POST "http://localhost:3000/api/sync?sample=1" -H "Authorization: Bearer dev-only-change-me"
```

This maps `scripts/sample-wc-matches.json` onto the seeded fixtures so you can see
group results, a knockout placeholder filling with real teams, eliminations, and a
final result — all without hitting the real API.

---

## 2. Supabase (database)

1. Create a project at <https://supabase.com>.
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
3. **Settings → API** → copy the **Project URL** and the **service_role** key.

## 3. football-data.org (live data)

1. Register (free): <https://www.football-data.org/client/register>.
2. Copy your API token. Free tier covers the World Cup (slightly delayed scores).

## 4. Deploy to Vercel

1. Push this folder to a Git repo and **Import Project** at <https://vercel.com>.
2. Add Environment Variables (Project → Settings → Environment Variables):

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | your Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service_role key |
   | `ADMIN_PASSWORD` | password for the Settings page |
   | `ADMIN_SESSION_SECRET` | long random string (`node -e "console.log(crypto.randomBytes(32).toString('hex'))"`) |
   | `FOOTBALL_DATA_TOKEN` | your football-data.org token |
   | `CRON_SECRET` | long random string (used to authorize `/api/sync`) |

3. Deploy.
4. **Seed the fixtures once** (idempotent — fills the 104 fixtures + migrates any
   legacy assignments/prizes):

   ```bash
   curl -X POST "https://YOUR-APP.vercel.app/api/seed" \
     -H "Content-Type: application/json" -d '{"password":"YOUR_ADMIN_PASSWORD"}'
   ```

---

## 5. Keep it updated (scheduling)

`/api/sync` fetches football-data.org and updates everything. Trigger it:

- **Manually** — the **Sync now** button on the Settings page.
- **Vercel Cron** — `vercel.json` already runs it daily (baseline; Hobby plan is
  daily-only).
- **GitHub Actions (recommended for match days)** — `.github/workflows/sync.yml`
  runs every ~15 min. Add repo secrets `APP_URL` (your Vercel URL) and
  `CRON_SECRET` (same value as the Vercel env var).
- **Supabase pg_cron** — alternative if you prefer DB-side scheduling.

---

## How the live sync maps data

`/api/sync` calls `GET /v4/competitions/WC/matches`, then (`lib/footballData.ts`):

- **Group games** are matched to our fixtures by the two team names.
- **Knockout games** are matched by stage + kickoff order the first time, and by
  the stored `api_match_id` thereafter; real advancing teams overwrite the slot
  placeholders ("Winner Gp A", etc.).
- **Eliminated** = losers of finished knockout games (and, once the Round of 32 is
  fully populated, any team that didn't reach it). Manual overrides are preserved.
- **Final result** is set when match 104 finishes.

> ⚠️ The exact `stage` strings and team-name spellings for the 48-team format
> should be confirmed against a live response. `STAGE_MAP` and `NAME_MAP` in
> `lib/footballData.ts` are written defensively and easy to extend if a name comes
> through unmapped.
