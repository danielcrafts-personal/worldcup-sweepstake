-- World Cup Sweepstake — Supabase schema.
-- Run this once in the Supabase SQL Editor (Dashboard → SQL → New query).
-- After deploying, POST /api/seed once to populate the 104 fixtures.

create table if not exists fixtures (
  match_no     int primary key,                 -- 1..104
  stage        text not null,                    -- GROUP | R32 | R16 | QF | SF | THIRD | FINAL
  group_label  text,
  match_date   date,
  kickoff      timestamptz,                       -- real UTC kickoff (from the API)
  venue        text,                              -- stadium (from the API, if provided)
  home_slot    text,                             -- placeholder label until team known
  away_slot    text,
  home_team    text,
  away_team    text,
  home_score   int,
  away_score   int,
  status       text not null default 'SCHEDULED',
  winner       text,
  api_match_id bigint,
  updated_at   timestamptz not null default now()
);
-- For databases created before kickoff/venue existed:
alter table fixtures add column if not exists kickoff timestamptz;
alter table fixtures add column if not exists venue text;

create table if not exists assignments (
  id     bigint generated always as identity primary key,
  person text not null,
  team   text not null
);

create table if not exists settings (
  id            int primary key default 1,
  site_title    text,
  prize_first   numeric not null default 0,
  prize_second  numeric not null default 0,
  result_first  text,
  result_second text,
  constraint settings_singleton check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;
-- For databases created before site_title existed:
alter table settings add column if not exists site_title text;

create table if not exists eliminated (
  team   text primary key,
  manual boolean not null default false
);

-- Per-day visit counts (traffic / unique visitors), shown only in Settings.
create table if not exists visits (
  day        date not null,
  visitor_id text not null,
  hits       int  not null default 0,
  primary key (day, visitor_id)
);

-- Lock the tables down. The app only ever reaches Supabase through Vercel API
-- routes using the SERVICE ROLE key, which bypasses RLS. Enabling RLS with no
-- policies means the anon/public key has no access even if it ever leaks.
alter table fixtures   enable row level security;
alter table assignments enable row level security;
alter table settings   enable row level security;
alter table eliminated enable row level security;
alter table visits     enable row level security;
