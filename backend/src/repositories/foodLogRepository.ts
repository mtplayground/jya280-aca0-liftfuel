import type { Pool, PoolClient } from 'pg';

import type { FoodEntry, FoodEntryInput, FoodLogDay } from '../models';

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
  created_at: Date;
  updated_at: Date;
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
