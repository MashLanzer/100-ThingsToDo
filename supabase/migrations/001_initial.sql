-- ThingsToDo Kawaii Edition - Initial Schema
-- Run this in Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- users
-- ─────────────────────────────────────────
create table if not exists users (
  id          uuid primary key,           -- Firebase UID (string cast to uuid via gen_random_uuid not used — we store as text-compatible uuid)
  name        text,
  email       text,
  avatar_url  text,
  couple_code char(6) unique not null,
  couple_id   uuid references couples(id) on delete set null,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- couples
-- ─────────────────────────────────────────
create table if not exists couples (
  id         uuid primary key default gen_random_uuid(),
  user1_id   uuid references users(id) on delete cascade,
  user2_id   uuid references users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Add FK after couples exists
alter table users
  add constraint users_couple_id_fk
  foreign key (couple_id) references couples(id) on delete set null;

-- ─────────────────────────────────────────
-- plans
-- ─────────────────────────────────────────
create table if not exists plans (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  couple_id   uuid not null references couples(id) on delete cascade,
  created_by  uuid not null references users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- tasks
-- ─────────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references plans(id) on delete cascade,
  title        text not null,
  icon         text default '✨',
  completed    boolean default false,
  completed_by uuid references users(id) on delete set null,
  completed_at timestamptz,
  sort_order   int default 0,
  created_by   uuid not null references users(id),
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────
-- places
-- ─────────────────────────────────────────
create table if not exists places (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade,
  name       text not null,
  country    text,
  lat        float not null,
  lng        float not null,
  status     text not null check (status in ('visited','wishlist')) default 'wishlist',
  note       text,
  date       date,
  photos     jsonb default '[]',
  created_by uuid not null references users(id),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- journal_entries
-- ─────────────────────────────────────────
create table if not exists journal_entries (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade,
  date       date not null,
  content    text not null,
  mood       text,
  photos     jsonb default '[]',
  created_by uuid not null references users(id),
  created_at timestamptz default now(),
  unique (couple_id, date)
);

-- ─────────────────────────────────────────
-- time_capsules
-- ─────────────────────────────────────────
create table if not exists time_capsules (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade,
  message     text not null,
  type        text not null default 'memory',
  unlock_date date not null,
  is_opened   boolean default false,
  attachments jsonb default '[]',
  created_by  uuid not null references users(id),
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────
-- savings_goals
-- ─────────────────────────────────────────
create table if not exists savings_goals (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references couples(id) on delete cascade,
  name          text not null,
  target_amount numeric(12,2) not null,
  created_by    uuid not null references users(id),
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- goal_contributions
-- ─────────────────────────────────────────
create table if not exists goal_contributions (
  id             uuid primary key default gen_random_uuid(),
  goal_id        uuid not null references savings_goals(id) on delete cascade,
  amount         numeric(12,2) not null,
  contributed_by uuid not null references users(id),
  created_at     timestamptz default now()
);

-- ─────────────────────────────────────────
-- favors
-- ─────────────────────────────────────────
create table if not exists favors (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references couples(id) on delete cascade,
  title        text not null,
  description  text,
  difficulty   text not null check (difficulty in ('easy','medium','hard')) default 'medium',
  points       int not null default 25,
  category     text not null default 'romantic',
  is_completed boolean default false,
  completed_by uuid references users(id) on delete set null,
  completed_at timestamptz,
  created_by   uuid not null references users(id),
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────
-- daily_challenge_history
-- ─────────────────────────────────────────
create table if not exists daily_challenge_history (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references couples(id) on delete cascade,
  challenge_text text not null,
  category       text,
  is_completed   boolean default false,
  accepted_by    uuid not null references users(id),
  accepted_at    timestamptz default now(),
  completed_at   timestamptz
);

-- ─────────────────────────────────────────
-- push_subscriptions
-- ─────────────────────────────────────────
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade unique,
  endpoint   text not null,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- Computed column helper: total_saved per goal
-- (use as a view for convenience)
-- ─────────────────────────────────────────
create or replace view savings_goals_with_total as
select
  g.*,
  coalesce(sum(c.amount), 0) as total_saved
from savings_goals g
left join goal_contributions c on c.goal_id = g.id
group by g.id;

-- ─────────────────────────────────────────
-- Row Level Security (optional but recommended)
-- Disable for simplicity — API routes verify Firebase token
-- ─────────────────────────────────────────
alter table users                    disable row level security;
alter table couples                  disable row level security;
alter table plans                    disable row level security;
alter table tasks                    disable row level security;
alter table places                   disable row level security;
alter table journal_entries          disable row level security;
alter table time_capsules            disable row level security;
alter table savings_goals            disable row level security;
alter table goal_contributions       disable row level security;
alter table favors                   disable row level security;
alter table daily_challenge_history  disable row level security;
alter table push_subscriptions       disable row level security;
