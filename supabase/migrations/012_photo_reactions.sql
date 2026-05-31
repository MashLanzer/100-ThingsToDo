create table if not exists photo_reactions (
  id          uuid primary key default gen_random_uuid(),
  photo_id    text not null,   -- UUID for Supabase photos or "firestore-xxx" for legacy
  user_id     uuid not null references users(id) on delete cascade,
  emoji       text not null check (emoji in ('❤️', '🔥', '✨')),
  created_at  timestamptz default now(),
  unique (photo_id, user_id, emoji)
);

create index if not exists photo_reactions_photo_id_idx on photo_reactions(photo_id);

alter table photo_reactions enable row level security;
create policy "photo_reactions_read_all"   on photo_reactions for select using (true);
create policy "photo_reactions_insert_own" on photo_reactions for insert with check (auth.uid()::text = user_id::text);
create policy "photo_reactions_delete_own" on photo_reactions for delete using (auth.uid()::text = user_id::text);
