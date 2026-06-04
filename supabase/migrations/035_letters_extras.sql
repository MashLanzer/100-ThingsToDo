alter table letters add column if not exists send_at timestamptz;
alter table letters add column if not exists photo_url text;
alter table letters add column if not exists reactions jsonb default '{}'::jsonb;
