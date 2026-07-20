import type { Pool, PoolClient } from 'pg';

import type {
  DailyFoodAggregation,
  FoodEntry,
  FoodEntryInput,
  FoodEntryPhotoInput,
  FoodItem,
  FoodLogDay
} from '../models';

type Queryable = Pool | PoolClient;

type FoodLogDayRow = {
  id: string;
  account_id: string;
  log_date: string | Date;
  created_at: Date;
  updated_at: Date;
};

type FoodEntryRow = {
  id: string;
  account_id: string;
  food_log_day_id: string;
  name: string;
  calories_kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  quantity_value: string;
  quantity_unit: string;
  meal_type: FoodEntry['mealType'];
  consumed_at: Date;
  source: FoodEntry['source'];
  notes: string | null;
  photo_byte_size: number | null;
  photo_content_type: string | null;
  photo_object_key: string | null;
  photo_uploaded_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type FoodItemRow = {
  id: string;
  name: string;
  brand: string | null;
  serving_quantity: string;
  serving_unit: string;
  calories_kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  created_at: Date;
  updated_at: Date;
};

type DailyFoodAggregationRow = {
  entry_count: string;
  calories_kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
};

export class FoodLogRepository {
  constructor(private readonly db: Queryable) {}

  async findDayByDate(accountId: string, logDate: string): Promise<FoodLogDay | null> {
    const result = await this.db.query<FoodLogDayRow>(
      'SELECT * FROM food_log_days WHERE account_id = $1 AND log_date = $2',
      [accountId, logDate]
    );

    return result.rows[0] ? mapFoodLogDay(result.rows[0]) : null;
  }

  async ensureDay(accountId: string, logDate: string): Promise<FoodLogDay> {
    const result = await this.db.query<FoodLogDayRow>(
      `
        WITH inserted AS (
          INSERT INTO food_log_days (account_id, log_date)
          VALUES ($1, $2)
          ON CONFLICT (account_id, log_date) DO NOTHING
          RETURNING *
        )
        SELECT * FROM inserted
        UNION ALL
        SELECT *
        FROM food_log_days
        WHERE account_id = $1 AND log_date = $2
        LIMIT 1
      `,
      [accountId, logDate]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Expected food log day upsert to return a row');
    }

    return mapFoodLogDay(row);
  }

  async findEntriesByDay(accountId: string, foodLogDayId: string): Promise<FoodEntry[]> {
    const result = await this.db.query<FoodEntryRow>(
      `
        SELECT *
        FROM food_entries
        WHERE account_id = $1 AND food_log_day_id = $2
        ORDER BY consumed_at ASC, created_at ASC
      `,
      [accountId, foodLogDayId]
    );

    return result.rows.map(mapFoodEntry);
  }

  async aggregateDay(accountId: string, logDate: string): Promise<DailyFoodAggregation> {
    const result = await this.db.query<DailyFoodAggregationRow>(
      `
        SELECT
          COUNT(fe.id) AS entry_count,
          COALESCE(SUM(fe.calories_kcal), 0) AS calories_kcal,
          COALESCE(SUM(fe.protein_g), 0) AS protein_g,
          COALESCE(SUM(fe.carbs_g), 0) AS carbs_g,
          COALESCE(SUM(fe.fat_g), 0) AS fat_g
        FROM food_log_days fld
        LEFT JOIN food_entries fe
          ON fe.food_log_day_id = fld.id
          AND fe.account_id = fld.account_id
        WHERE fld.account_id = $1
          AND fld.log_date = $2
      `,
      [accountId, logDate]
    );

    const row = result.rows[0];

    return {
      date: logDate,
      entryCount: row ? Number(row.entry_count) : 0,
      totals: {
        caloriesKcal: row ? Number(row.calories_kcal) : 0,
        carbsGrams: row ? Number(row.carbs_g) : 0,
        fatGrams: row ? Number(row.fat_g) : 0,
        proteinGrams: row ? Number(row.protein_g) : 0
      }
    };
  }

  async findEntryById(accountId: string, foodEntryId: string): Promise<FoodEntry | null> {
    const result = await this.db.query<FoodEntryRow>(
      'SELECT * FROM food_entries WHERE account_id = $1 AND id = $2',
      [accountId, foodEntryId]
    );

    return result.rows[0] ? mapFoodEntry(result.rows[0]) : null;
  }

  async searchFoodItems(query: string, limit = 12): Promise<FoodItem[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const result = await this.db.query<FoodItemRow>(
      `
        SELECT *
        FROM food_items
        WHERE
          search_text ILIKE '%' || $1 || '%'
          OR to_tsvector('simple', search_text) @@ plainto_tsquery('simple', $1)
        ORDER BY
          CASE
            WHEN lower(name) = $1 THEN 0
            WHEN lower(name) LIKE $1 || '%' THEN 1
            WHEN search_text ILIKE '%' || $1 || '%' THEN 2
            ELSE 3
          END,
          name ASC
        LIMIT $2
      `,
      [normalizedQuery, limit]
    );

    return result.rows.map(mapFoodItem);
  }

  async createEntry(
    accountId: string,
    foodLogDayId: string,
    input: FoodEntryInput
  ): Promise<FoodEntry> {
    const result = await this.db.query<FoodEntryRow>(
      `
        INSERT INTO food_entries (
          account_id,
          food_log_day_id,
          name,
          calories_kcal,
          protein_g,
          carbs_g,
          fat_g,
          quantity_value,
          quantity_unit,
          meal_type,
          consumed_at,
          source,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `,
      [
        accountId,
        foodLogDayId,
        input.name,
        input.caloriesKcal,
        input.proteinGrams,
        input.carbsGrams,
        input.fatGrams,
        input.quantityValue,
        input.quantityUnit,
        input.mealType,
        input.consumedAt,
        input.source,
        input.notes ?? null
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Expected food entry insert to return a row');
    }

    return mapFoodEntry(row);
  }

  async updateEntry(
    accountId: string,
    foodEntryId: string,
    foodLogDayId: string,
    input: FoodEntryInput
  ): Promise<FoodEntry> {
    const result = await this.db.query<FoodEntryRow>(
      `
        UPDATE food_entries
        SET
          food_log_day_id = $3,
          name = $4,
          calories_kcal = $5,
          protein_g = $6,
          carbs_g = $7,
          fat_g = $8,
          quantity_value = $9,
          quantity_unit = $10,
          meal_type = $11,
          consumed_at = $12,
          source = $13,
          notes = $14
        WHERE account_id = $1 AND id = $2
        RETURNING *
      `,
      [
        accountId,
        foodEntryId,
        foodLogDayId,
        input.name,
        input.caloriesKcal,
        input.proteinGrams,
        input.carbsGrams,
        input.fatGrams,
        input.quantityValue,
        input.quantityUnit,
        input.mealType,
        input.consumedAt,
        input.source,
        input.notes ?? null
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Expected food entry update to return a row');
    }

    return mapFoodEntry(row);
  }

  async attachPhoto(
    accountId: string,
    foodEntryId: string,
    input: FoodEntryPhotoInput
  ): Promise<FoodEntry> {
    const result = await this.db.query<FoodEntryRow>(
      `
        UPDATE food_entries
        SET
          photo_object_key = $3,
          photo_content_type = $4,
          photo_byte_size = $5,
          photo_uploaded_at = $6
        WHERE account_id = $1 AND id = $2
        RETURNING *
      `,
      [
        accountId,
        foodEntryId,
        input.objectKey,
        input.contentType,
        input.byteSize,
        input.uploadedAt
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Expected food entry photo attach to return a row');
    }

    return mapFoodEntry(row);
  }
}

function mapFoodLogDay(row: FoodLogDayRow): FoodLogDay {
  return {
    id: row.id,
    accountId: row.account_id,
    logDate: normalizeDate(row.log_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFoodEntry(row: FoodEntryRow): FoodEntry {
  return {
    id: row.id,
    accountId: row.account_id,
    foodLogDayId: row.food_log_day_id,
    name: row.name,
    caloriesKcal: Number(row.calories_kcal),
    proteinGrams: Number(row.protein_g),
    carbsGrams: Number(row.carbs_g),
    fatGrams: Number(row.fat_g),
    quantityValue: Number(row.quantity_value),
    quantityUnit: row.quantity_unit,
    mealType: row.meal_type,
    consumedAt: row.consumed_at,
    source: row.source,
    notes: row.notes,
    photoByteSize: row.photo_byte_size,
    photoContentType: row.photo_content_type,
    photoObjectKey: row.photo_object_key,
    photoUploadedAt: row.photo_uploaded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFoodItem(row: FoodItemRow): FoodItem {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    servingQuantity: Number(row.serving_quantity),
    servingUnit: row.serving_unit,
    caloriesKcal: Number(row.calories_kcal),
    proteinGrams: Number(row.protein_g),
    carbsGrams: Number(row.carbs_g),
    fatGrams: Number(row.fat_g),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}
