create table if not exists photo_albums (
  id           uuid primary key default gen_random_uuid(),
  couple_id    text not null,
  name         text not null,
  description  text,
  cover_image  text,
  created_by   text not null,
  created_at   timestamptz not null default now()
);

alter table photo_albums enable row level security;
create policy "photo_albums_all" on photo_albums for all using (true) with check (true);

-- Add album_id to photos table
alter table photos add column if not exists album_id uuid references photo_albums(id) on delete set null;
