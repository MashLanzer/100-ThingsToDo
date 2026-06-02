alter table photos add column if not exists group_id uuid;
create index if not exists idx_photos_group_id on photos(group_id) where group_id is not null;
