import type { Pool, PoolClient } from 'pg';

import type { ProfileInput, UserProfile } from '../models';

type Queryable = Pool | PoolClient;

type UserProfileRow = {
  account_id: string;
  activity_level: UserProfile['activityLevel'];
  age_years: number;
  body_fat_is_estimate: boolean;
  body_fat_percent: string | null;
  created_at: Date;
  goal: UserProfile['goal'];
  height_cm: string;
  sex: UserProfile['sex'];
  training_days_per_week: number;
  training_split: UserProfile['trainingSplit'];
  updated_at: Date;
  weight_kg: string;
};

export class ProfileRepository {
  constructor(private readonly db: Queryable) {}

  async findByAccountId(accountId: string): Promise<UserProfile | null> {
    const result = await this.db.query<UserProfileRow>(
      'SELECT * FROM user_profiles WHERE account_id = $1',
      [accountId]
    );

    return result.rows[0] ? mapProfile(result.rows[0]) : null;
  }

  async upsert(accountId: string, input: ProfileInput): Promise<UserProfile> {
    const result = await this.db.query<UserProfileRow>(
      `
        INSERT INTO user_profiles (
          account_id,
          weight_kg,
          height_cm,
          age_years,
          sex,
          activity_level,
          goal,
          body_fat_percent,
          body_fat_is_estimate,
          training_split,
          training_days_per_week
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (account_id)
        DO UPDATE SET
          weight_kg = EXCLUDED.weight_kg,
          height_cm = EXCLUDED.height_cm,
          age_years = EXCLUDED.age_years,
          sex = EXCLUDED.sex,
          activity_level = EXCLUDED.activity_level,
          goal = EXCLUDED.goal,
          body_fat_percent = EXCLUDED.body_fat_percent,
          body_fat_is_estimate = EXCLUDED.body_fat_is_estimate,
          training_split = EXCLUDED.training_split,
          training_days_per_week = EXCLUDED.training_days_per_week
        RETURNING *
      `,
      [
        accountId,
        input.weightKg,
        input.heightCm,
        input.ageYears,
        input.sex,
        input.activityLevel,
        input.goal,
        input.bodyFatPercent,
        input.bodyFatIsEstimate,
        input.trainingSplit,
        input.trainingDaysPerWeek
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Expected profile upsert to return a row');
    }

    return mapProfile(row);
  }
}

function mapProfile(row: UserProfileRow): UserProfile {
  return {
    accountId: row.account_id,
    activityLevel: row.activity_level,
    ageYears: row.age_years,
    bodyFatIsEstimate: row.body_fat_is_estimate,
    bodyFatPercent: row.body_fat_percent === null ? null : Number(row.body_fat_percent),
    createdAt: row.created_at,
    goal: row.goal,
    heightCm: Number(row.height_cm),
    sex: row.sex,
    trainingDaysPerWeek: row.training_days_per_week,
    trainingSplit: row.training_split,
    updatedAt: row.updated_at,
    weightKg: Number(row.weight_kg)
  };
}
