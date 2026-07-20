CREATE TABLE IF NOT EXISTS progress_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  weight_kg NUMERIC(6, 2) CHECK (
    weight_kg IS NULL OR (weight_kg >= 20 AND weight_kg <= 400)
  ),
  body_fat_percent NUMERIC(4, 1) CHECK (
    body_fat_percent IS NULL OR (body_fat_percent >= 3 AND body_fat_percent <= 75)
  ),
  body_fat_is_estimate BOOLEAN NOT NULL DEFAULT TRUE,
  performance_metrics JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(performance_metrics) = 'array'
  ),
  notes TEXT CHECK (
    notes IS NULL OR LENGTH(notes) <= 1000
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, entry_date),
  CHECK (
    weight_kg IS NOT NULL
    OR body_fat_percent IS NOT NULL
    OR jsonb_array_length(performance_metrics) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_progress_entries_account_date
  ON progress_entries (account_id, entry_date DESC);

DROP TRIGGER IF EXISTS set_progress_entries_updated_at ON progress_entries;
CREATE TRIGGER set_progress_entries_updated_at
  BEFORE UPDATE ON progress_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
