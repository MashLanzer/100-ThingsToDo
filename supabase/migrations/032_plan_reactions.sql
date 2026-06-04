create table if not exists plan_reactions (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references plans(id) on delete cascade,
  user_id    text not null,
  emoji      text not null,
  created_at timestamptz default now(),
  unique (plan_id, user_id, emoji)
);

alter table plan_reactions enable row level security;

drop policy if exists "plan_reactions_all" on plan_reactions;
create policy "plan_reactions_all" on plan_reactions
  using (true) with check (true);
