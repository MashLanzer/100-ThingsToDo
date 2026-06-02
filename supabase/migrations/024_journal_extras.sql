-- Journal extras: tags, location and per-entry reactions
-- tags:      array of free-text labels, e.g. ["viaje", "aniversario"]
-- location:  free-text place where the day happened
-- reactions: map of user_id -> emoji, so a partner can react to an entry
alter table journal_entries add column if not exists tags      jsonb default '[]'::jsonb;
alter table journal_entries add column if not exists location  text;
alter table journal_entries add column if not exists reactions jsonb default '{}'::jsonb;
