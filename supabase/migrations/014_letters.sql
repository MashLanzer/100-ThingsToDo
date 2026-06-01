create table if not exists letters (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  from_user_id text not null,
  to_user_id text not null,
  content text not null,
  subject text,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table letters enable row level security;
create policy "letters_couple" on letters for all using (true);
