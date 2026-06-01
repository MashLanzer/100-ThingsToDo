-- Store who uploaded each photo so the feed can show their name + avatar
alter table photos add column if not exists uploaded_by        text;
alter table photos add column if not exists uploaded_by_avatar text;
-- uploaded_by_name already exists from migration 011
