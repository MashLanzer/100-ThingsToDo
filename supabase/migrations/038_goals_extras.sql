ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS deadline date;
ALTER TABLE goal_contributions ADD COLUMN IF NOT EXISTS note text;
