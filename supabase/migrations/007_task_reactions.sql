create table if not exists task_reactions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(task_id, user_id, emoji)
);
