-- Fix journal_entries: allow each partner to write their own entry per day
-- Old constraint only allowed one entry per couple per date (single partner could write)
alter table journal_entries drop constraint if exists journal_entries_couple_id_date_key;
alter table journal_entries add constraint journal_entries_couple_id_date_created_by_key
  unique (couple_id, date, created_by);
