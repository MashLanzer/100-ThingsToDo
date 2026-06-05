CREATE TABLE IF NOT EXISTS couple_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id text NOT NULL,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '💫',
  moment_date date NOT NULL,
  description text,
  photo_url text,
  thumb_url text,
  added_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS couple_moments_couple_idx ON couple_moments (couple_id);
