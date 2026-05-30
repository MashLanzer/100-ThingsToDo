-- Migration 002: shared features

-- Allow each user to have their own journal entry per day
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_couple_id_date_key;
ALTER TABLE journal_entries ADD CONSTRAINT IF NOT EXISTS journal_entries_couple_id_date_user_key UNIQUE (couple_id, date, created_by);

-- Music playlists shared between couples
CREATE TABLE IF NOT EXISTS music_playlists (
  couple_id uuid PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);
