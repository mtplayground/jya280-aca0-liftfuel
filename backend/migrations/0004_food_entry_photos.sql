ALTER TABLE food_entries
  ADD COLUMN IF NOT EXISTS photo_object_key TEXT,
  ADD COLUMN IF NOT EXISTS photo_content_type TEXT,
  ADD COLUMN IF NOT EXISTS photo_byte_size INTEGER,
  ADD COLUMN IF NOT EXISTS photo_uploaded_at TIMESTAMPTZ;

ALTER TABLE food_entries
  ADD CONSTRAINT food_entries_photo_object_key_not_blank
    CHECK (photo_object_key IS NULL OR LENGTH(TRIM(photo_object_key)) > 0),
  ADD CONSTRAINT food_entries_photo_content_type_valid
    CHECK (
      photo_content_type IS NULL
      OR photo_content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')
    ),
  ADD CONSTRAINT food_entries_photo_byte_size_valid
    CHECK (
      photo_byte_size IS NULL
      OR (photo_byte_size > 0 AND photo_byte_size <= 8388608)
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_food_entries_photo_object_key
  ON food_entries (photo_object_key)
  WHERE photo_object_key IS NOT NULL;
