create table if not exists task_subtasks (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  title      text not null,
  completed  boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table task_subtasks enable row level security;
create policy "subtasks_all" on task_subtasks for all using (true) with check (true);
