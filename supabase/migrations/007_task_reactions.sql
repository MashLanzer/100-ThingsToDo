create table if not exists task_reactions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  user_id text not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(task_id, user_id, emoji)
);

alter table task_reactions enable row level security;
create policy "task_reactions_read_all"   on task_reactions for select using (true);
create policy "task_reactions_insert_all" on task_reactions for insert with check (true);
create policy "task_reactions_delete_all" on task_reactions for delete using (true);
