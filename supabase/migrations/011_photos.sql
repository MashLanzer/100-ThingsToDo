-- Photos table for shared gallery between ThingsToDo and 14-Febrero
-- NOTE: You must manually create the 'couple-photos' Supabase Storage bucket
--       in the Supabase Dashboard (Storage → New Bucket → Name: couple-photos, Public: true)
--       before the upload API will work.

create table if not exists photos (
  id               uuid primary key default gen_random_uuid(),
  collection_key   text not null,
  image_url        text not null,
  thumb_url        text,
  delete_url       text,
  caption          text,
  uploaded_by_name text,
  source           text default 'thingstodo',
  created_at       timestamptz default now()
);

create index if not exists photos_collection_key_idx on photos(collection_key);

alter table photos enable row level security;
create policy "photos_read_all"    on photos for select using (true);
create policy "photos_insert_all"  on photos for insert with check (true);
create policy "photos_delete_all"  on photos for delete using (true);
