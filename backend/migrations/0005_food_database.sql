CREATE TABLE IF NOT EXISTS food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (LENGTH(TRIM(name)) > 0 AND LENGTH(name) <= 160),
  brand TEXT CHECK (brand IS NULL OR LENGTH(brand) <= 120),
  serving_quantity NUMERIC(10, 3) NOT NULL DEFAULT 1 CHECK (
    serving_quantity > 0 AND serving_quantity <= 100000
  ),
  serving_unit TEXT NOT NULL DEFAULT 'serving' CHECK (
    LENGTH(TRIM(serving_unit)) > 0 AND LENGTH(serving_unit) <= 40
  ),
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
  search_text TEXT GENERATED ALWAYS AS (
    lower(name || ' ' || coalesce(brand, '') || ' ' || serving_unit)
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_items_search_text
  ON food_items USING gin (to_tsvector('simple', search_text));

DROP TRIGGER IF EXISTS set_food_items_updated_at ON food_items;
CREATE TRIGGER set_food_items_updated_at
  BEFORE UPDATE ON food_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

INSERT INTO food_items (
  name,
  brand,
  serving_quantity,
  serving_unit,
  calories_kcal,
  protein_g,
  carbs_g,
  fat_g
)
VALUES
  ('Chicken breast, cooked', NULL, 100, 'g', 165, 31, 0, 3.6),
  ('Salmon, cooked', NULL, 100, 'g', 206, 22.1, 0, 12.4),
  ('Lean ground beef, cooked', NULL, 100, 'g', 217, 26.1, 0, 11.8),
  ('Egg, large', NULL, 1, 'egg', 72, 6.3, 0.4, 4.8),
  ('Greek yogurt, plain nonfat', NULL, 170, 'g', 100, 17, 6, 0),
  ('Cottage cheese, low fat', NULL, 113, 'g', 90, 13, 5, 2.5),
  ('Tofu, firm', NULL, 100, 'g', 144, 17.3, 2.8, 8.7),
  ('Whey protein powder', NULL, 1, 'scoop', 120, 24, 3, 1.5),
  ('White rice, cooked', NULL, 100, 'g', 130, 2.7, 28.2, 0.3),
  ('Brown rice, cooked', NULL, 100, 'g', 112, 2.3, 23.5, 0.8),
  ('Oats, dry', NULL, 40, 'g', 150, 5, 27, 3),
  ('Sweet potato, baked', NULL, 100, 'g', 90, 2, 20.7, 0.2),
  ('Banana, medium', NULL, 1, 'banana', 105, 1.3, 27, 0.4),
  ('Apple, medium', NULL, 1, 'apple', 95, 0.5, 25, 0.3),
  ('Avocado', NULL, 100, 'g', 160, 2, 8.5, 14.7),
  ('Olive oil', NULL, 1, 'tbsp', 119, 0, 0, 13.5),
  ('Peanut butter', NULL, 2, 'tbsp', 190, 7, 7, 16),
  ('Almonds', NULL, 28, 'g', 164, 6, 6, 14),
  ('Broccoli, cooked', NULL, 100, 'g', 35, 2.4, 7.2, 0.4),
  ('Spinach, raw', NULL, 85, 'g', 20, 2.5, 3.1, 0.3),
  ('Black beans, cooked', NULL, 100, 'g', 132, 8.9, 23.7, 0.5),
  ('Whole wheat bread', NULL, 1, 'slice', 80, 4, 14, 1),
  ('Pasta, cooked', NULL, 100, 'g', 158, 5.8, 30.9, 0.9),
  ('Milk, 2 percent', NULL, 1, 'cup', 122, 8.1, 11.7, 4.8)
ON CONFLICT (name) DO UPDATE
SET
  brand = EXCLUDED.brand,
  serving_quantity = EXCLUDED.serving_quantity,
  serving_unit = EXCLUDED.serving_unit,
  calories_kcal = EXCLUDED.calories_kcal,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g;
