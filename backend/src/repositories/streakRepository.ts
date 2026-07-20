import type { Pool, PoolClient } from 'pg';

import type { DailyCheckIn, DailyCheckInInput, StreakSummary } from '../models';

type Queryable = Pool | PoolClient;

type DailyCheckInRow = {
  id: string;
  account_id: string;
  check_in_date: string | Date;
  logged_food: boolean;
  on_track: boolean;
  on_track_state: DailyCheckIn['onTrackState'];
  calories_kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  target_calories_kcal: string;
  target_protein_g: string;
  target_carbs_g: string;
  target_fat_g: string;
  checked_in_at: Date;
  created_at: Date;
  updated_at: Date;
};

export class StreakRepository {
  constructor(private readonly db: Queryable) {}

  async upsertDailyCheckIn(input: DailyCheckInInput): Promise<DailyCheckIn> {
    const result = await this.db.query<DailyCheckInRow>(
      `
        INSERT INTO daily_check_ins (
          account_id,
          check_in_date,
          logged_food,
          on_track,
          on_track_state,
          calories_kcal,
          protein_g,
          carbs_g,
          fat_g,
          target_calories_kcal,
          target_protein_g,
          target_carbs_g,
          target_fat_g,
          checked_in_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (account_id, check_in_date)
        DO UPDATE SET
          logged_food = EXCLUDED.logged_food,
          on_track = EXCLUDED.on_track,
          on_track_state = EXCLUDED.on_track_state,
          calories_kcal = EXCLUDED.calories_kcal,
          protein_g = EXCLUDED.protein_g,
          carbs_g = EXCLUDED.carbs_g,
          fat_g = EXCLUDED.fat_g,
          target_calories_kcal = EXCLUDED.target_calories_kcal,
          target_protein_g = EXCLUDED.target_protein_g,
          target_carbs_g = EXCLUDED.target_carbs_g,
          target_fat_g = EXCLUDED.target_fat_g,
          checked_in_at = EXCLUDED.checked_in_at
        RETURNING *
      `,
      [
        input.accountId,
        input.checkInDate,
        input.loggedFood,
        input.onTrack,
        input.onTrackState,
        input.totals.caloriesKcal,
        input.totals.proteinGrams,
        input.totals.carbsGrams,
        input.totals.fatGrams,
        input.target.caloriesKcal,
        input.target.proteinGrams,
        input.target.carbsGrams,
        input.target.fatGrams,
        input.checkedInAt
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Expected daily check-in upsert to return a row');
    }

    return mapDailyCheckIn(row);
  }

  async getSummary(
    accountId: string,
    throughDate: string,
    recentLimit = 14
  ): Promise<StreakSummary> {
    const allResult = await this.db.query<DailyCheckInRow>(
      `
        SELECT *
        FROM daily_check_ins
        WHERE account_id = $1
          AND check_in_date <= $2
        ORDER BY check_in_date DESC
      `,
      [accountId, throughDate]
    );

    const recentResult = await this.db.query<DailyCheckInRow>(
      `
        SELECT *
        FROM daily_check_ins
        WHERE account_id = $1
          AND check_in_date <= $2
        ORDER BY check_in_date DESC
        LIMIT $3
      `,
      [accountId, throughDate, recentLimit]
    );

    const checkIns = allResult.rows.map(mapDailyCheckIn);

    return {
      currentLoggingStreakDays: calculateCurrentStreak(checkIns, 'loggedFood'),
      currentOnTrackStreakDays: calculateCurrentStreak(checkIns, 'onTrack'),
      lastCheckInDate: checkIns[0]?.checkInDate ?? null,
      longestLoggingStreakDays: calculateLongestStreak(checkIns, 'loggedFood'),
      longestOnTrackStreakDays: calculateLongestStreak(checkIns, 'onTrack'),
      recentCheckIns: recentResult.rows.map(mapDailyCheckIn)
    };
  }
}

function calculateCurrentStreak(
  checkInsNewestFirst: DailyCheckIn[],
  field: 'loggedFood' | 'onTrack'
): number {
  let streak = 0;
  let expectedDate: string | null = null;

  for (const checkIn of checkInsNewestFirst) {
    if (expectedDate !== null && checkIn.checkInDate !== expectedDate) {
      break;
    }

    if (!checkIn[field]) {
      break;
    }

    streak += 1;
    expectedDate = addUtcDays(checkIn.checkInDate, -1);
  }

  return streak;
}

function calculateLongestStreak(
  checkInsNewestFirst: DailyCheckIn[],
  field: 'loggedFood' | 'onTrack'
): number {
  let longest = 0;
  let current = 0;
  let previousDate: string | null = null;

  for (const checkIn of [...checkInsNewestFirst].reverse()) {
    const isConsecutive = previousDate === null || checkIn.checkInDate === addUtcDays(previousDate, 1);
    if (!isConsecutive) {
      current = 0;
    }

    current = checkIn[field] ? current + 1 : 0;
    longest = Math.max(longest, current);
    previousDate = checkIn.checkInDate;
  }

  return longest;
}

function mapDailyCheckIn(row: DailyCheckInRow): DailyCheckIn {
  return {
    accountId: row.account_id,
    checkedInAt: row.checked_in_at,
    checkInDate: normalizeDate(row.check_in_date),
    createdAt: row.created_at,
    id: row.id,
    loggedFood: row.logged_food,
    onTrack: row.on_track,
    onTrackState: row.on_track_state,
    target: {
      caloriesKcal: Number(row.target_calories_kcal),
      carbsGrams: Number(row.target_carbs_g),
      fatGrams: Number(row.target_fat_g),
      proteinGrams: Number(row.target_protein_g)
    },
    totals: {
      caloriesKcal: Number(row.calories_kcal),
      carbsGrams: Number(row.carbs_g),
      fatGrams: Number(row.fat_g),
      proteinGrams: Number(row.protein_g)
    },
    updatedAt: row.updated_at
  };
}

function addUtcDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}
