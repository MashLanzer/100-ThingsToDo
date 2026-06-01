-- Instagram-style comments on shared photos
create table if not exists photo_comments (
  id          uuid primary key default gen_random_uuid(),
  photo_id    text not null,   -- UUID for Supabase photos or "firestore-xxx" for legacy
  user_id     text not null references users(id) on delete cascade,
  content     text not null,
  created_at  timestamptz default now()
);

create index if not exists photo_comments_photo_id_idx on photo_comments(photo_id);

alter table photo_comments enable row level security;
create policy "photo_comments_read_all"   on photo_comments for select using (true);
create policy "photo_comments_insert_own" on photo_comments for insert with check (true);
create policy "photo_comments_delete_own" on photo_comments for delete using (true);
