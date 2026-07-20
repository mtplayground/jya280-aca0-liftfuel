CREATE TABLE IF NOT EXISTS user_profiles (
  account_id UUID PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg >= 20 AND weight_kg <= 400),
  height_cm NUMERIC(5, 2) NOT NULL CHECK (height_cm >= 90 AND height_cm <= 250),
  age_years INTEGER NOT NULL CHECK (age_years >= 13 AND age_years <= 100),
  sex TEXT NOT NULL CHECK (sex IN ('female', 'male', 'non_binary', 'prefer_not_to_say')),
  activity_level TEXT NOT NULL CHECK (
    activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  goal TEXT NOT NULL CHECK (goal IN ('cut', 'bulk', 'maintain')),
  body_fat_percent NUMERIC(4, 1) CHECK (
    body_fat_percent IS NULL OR (body_fat_percent >= 3 AND body_fat_percent <= 75)
  ),
  body_fat_is_estimate BOOLEAN NOT NULL DEFAULT TRUE,
  training_split TEXT NOT NULL CHECK (
    training_split IN ('full_body', 'upper_lower', 'push_pull_legs', 'body_part', 'sport_specific', 'custom')
  ),
  training_days_per_week INTEGER NOT NULL CHECK (
    training_days_per_week >= 0 AND training_days_per_week <= 7
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
