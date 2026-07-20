CREATE TABLE IF NOT EXISTS food_log_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, log_date),
  UNIQUE (id, account_id)
);

CREATE TABLE IF NOT EXISTS food_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  food_log_day_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) > 0 AND LENGTH(name) <= 160),
  calories_kcal NUMERIC(8, 2) NOT NULL CHECK (
    calories_kcal >= 0 AND calories_kcal <= 10000
  ),
  protein_g NUMERIC(7, 2) NOT NULL CHECK (
    protein_g >= 0 AND protein_g <= 1000
  ),
  carbs_g NUMERIC(7, 2) NOT NULL CHECK (
    carbs_g >= 0 AND carbs_g <= 1000
  ),
  fat_g NUMERIC(7, 2) NOT NULL CHECK (
    fat_g >= 0 AND fat_g <= 1000
  ),
  quantity_value NUMERIC(10, 3) NOT NULL DEFAULT 1 CHECK (
    quantity_value > 0 AND quantity_value <= 100000
  ),
  quantity_unit TEXT NOT NULL DEFAULT 'serving' CHECK (
    LENGTH(TRIM(quantity_unit)) > 0 AND LENGTH(quantity_unit) <= 40
  ),
  meal_type TEXT NOT NULL CHECK (
    meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')
  ),
  consumed_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (
    source IN ('photo_estimate', 'manual')
  ),
  notes TEXT CHECK (
    notes IS NULL OR LENGTH(notes) <= 1000
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (food_log_day_id, account_id)
    REFERENCES food_log_days(id, account_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_food_log_days_account_date
  ON food_log_days (account_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_food_entries_account_consumed_at
  ON food_entries (account_id, consumed_at DESC);

CREATE INDEX IF NOT EXISTS idx_food_entries_day_meal_time
  ON food_entries (food_log_day_id, meal_type, consumed_at);

CREATE INDEX IF NOT EXISTS idx_food_entries_source
  ON food_entries (source);

DROP TRIGGER IF EXISTS set_food_log_days_updated_at ON food_log_days;
CREATE TRIGGER set_food_log_days_updated_at
  BEFORE UPDATE ON food_log_days
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_food_entries_updated_at ON food_entries;
CREATE TRIGGER set_food_entries_updated_at
  BEFORE UPDATE ON food_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
