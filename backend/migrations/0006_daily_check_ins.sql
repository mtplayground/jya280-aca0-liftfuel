CREATE TABLE IF NOT EXISTS daily_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  logged_food BOOLEAN NOT NULL DEFAULT FALSE,
  on_track BOOLEAN NOT NULL DEFAULT FALSE,
  on_track_state TEXT NOT NULL CHECK (
    on_track_state IN ('below_target', 'on_track', 'over_target')
  ),
  calories_kcal NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (
    calories_kcal >= 0 AND calories_kcal <= 100000
  ),
  protein_g NUMERIC(7, 2) NOT NULL DEFAULT 0 CHECK (
    protein_g >= 0 AND protein_g <= 10000
  ),
  carbs_g NUMERIC(7, 2) NOT NULL DEFAULT 0 CHECK (
    carbs_g >= 0 AND carbs_g <= 10000
  ),
  fat_g NUMERIC(7, 2) NOT NULL DEFAULT 0 CHECK (
    fat_g >= 0 AND fat_g <= 10000
  ),
  target_calories_kcal NUMERIC(8, 2) NOT NULL CHECK (
    target_calories_kcal >= 0 AND target_calories_kcal <= 100000
  ),
  target_protein_g NUMERIC(7, 2) NOT NULL CHECK (
    target_protein_g >= 0 AND target_protein_g <= 10000
  ),
  target_carbs_g NUMERIC(7, 2) NOT NULL CHECK (
    target_carbs_g >= 0 AND target_carbs_g <= 10000
  ),
  target_fat_g NUMERIC(7, 2) NOT NULL CHECK (
    target_fat_g >= 0 AND target_fat_g <= 10000
  ),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_check_ins_account_date
  ON daily_check_ins (account_id, check_in_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_check_ins_account_on_track
  ON daily_check_ins (account_id, check_in_date DESC)
  WHERE on_track = TRUE;

DROP TRIGGER IF EXISTS set_daily_check_ins_updated_at ON daily_check_ins;
CREATE TRIGGER set_daily_check_ins_updated_at
  BEFORE UPDATE ON daily_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
