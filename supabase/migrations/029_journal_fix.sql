-- Ensure the correct 3-column unique constraint exists for journal entries.
-- Drops old 2-column constraint if present, then adds 3-column one.
alter table journal_entries drop constraint if exists journal_entries_couple_id_date_key;
alter table journal_entries drop constraint if exists journal_entries_couple_id_date_user_key;
alter table journal_entries drop constraint if exists journal_entries_couple_id_date_created_by_key;

alter table journal_entries add constraint journal_entries_couple_id_date_created_by_key
  unique (couple_id, date, created_by);

-- Ensure optional columns exist
alter table journal_entries add column if not exists tags text[] default '{}';
alter table journal_entries add column if not exists location text;
alter table journal_entries add column if not exists audio_url text;
