create table if not exists photo_views (
  id         uuid primary key default gen_random_uuid(),
  photo_id   text not null,
  user_id    text not null,
  viewed_at  timestamptz not null default now(),
  unique(photo_id, user_id)
);
alter table photo_views enable row level security;
create policy "photo_views_all" on photo_views for all using (true) with check (true);
