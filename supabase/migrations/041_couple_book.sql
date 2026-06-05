CREATE TABLE IF NOT EXISTS couple_book_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id text NOT NULL,
  author_id text NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS couple_book_entries_couple_idx ON couple_book_entries (couple_id);
