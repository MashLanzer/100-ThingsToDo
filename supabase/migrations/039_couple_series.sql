CREATE TABLE IF NOT EXISTS couple_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id text NOT NULL,
  tvmaze_id integer NOT NULL,
  title text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'wishlist',
  current_season integer NOT NULL DEFAULT 1,
  current_episode integer NOT NULL DEFAULT 0,
  added_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_id, tvmaze_id, added_by)
);

CREATE INDEX IF NOT EXISTS couple_series_couple_idx ON couple_series (couple_id);
