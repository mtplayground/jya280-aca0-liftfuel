import type { Pool, PoolClient } from 'pg';

import type {
  PerformanceMetric,
  ProgressEntry,
  ProgressEntryInput,
  ProgressEntryQuery
} from '../models';

type Queryable = Pool | PoolClient;

type ProgressEntryRow = {
  id: string;
  account_id: string;
  entry_date: string | Date;
  weight_kg: string | null;
  body_fat_percent: string | null;
  body_fat_is_estimate: boolean;
  performance_metrics: unknown;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

export class ProgressRepository {
  constructor(private readonly db: Queryable) {}

  async upsert(accountId: string, input: ProgressEntryInput): Promise<ProgressEntry> {
    const result = await this.db.query<ProgressEntryRow>(
      `
        INSERT INTO progress_entries (
          account_id,
          entry_date,
          weight_kg,
          body_fat_percent,
          body_fat_is_estimate,
          performance_metrics,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        ON CONFLICT (account_id, entry_date)
        DO UPDATE SET
          weight_kg = EXCLUDED.weight_kg,
          body_fat_percent = EXCLUDED.body_fat_percent,
          body_fat_is_estimate = EXCLUDED.body_fat_is_estimate,
          performance_metrics = EXCLUDED.performance_metrics,
          notes = EXCLUDED.notes
        RETURNING *
      `,
      [
        accountId,
        input.entryDate,
        input.weightKg,
        input.bodyFatPercent,
        input.bodyFatIsEstimate,
        JSON.stringify(input.performanceMetrics),
        input.notes
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Expected progress entry upsert to return a row');
    }

    return mapProgressEntry(row);
  }

  async findByDate(accountId: string, entryDate: string): Promise<ProgressEntry | null> {
    const result = await this.db.query<ProgressEntryRow>(
      `
        SELECT *
        FROM progress_entries
        WHERE account_id = $1
          AND entry_date = $2
      `,
      [accountId, entryDate]
    );

    return result.rows[0] ? mapProgressEntry(result.rows[0]) : null;
  }

  async list(accountId: string, query: ProgressEntryQuery): Promise<ProgressEntry[]> {
    const result = await this.db.query<ProgressEntryRow>(
      `
        SELECT *
        FROM progress_entries
        WHERE account_id = $1
          AND ($2::date IS NULL OR entry_date >= $2::date)
          AND ($3::date IS NULL OR entry_date <= $3::date)
        ORDER BY entry_date DESC
        LIMIT $4
      `,
      [accountId, query.fromDate ?? null, query.toDate ?? null, query.limit]
    );

    return result.rows.map(mapProgressEntry);
  }
}

function mapProgressEntry(row: ProgressEntryRow): ProgressEntry {
  return {
    accountId: row.account_id,
    bodyFatIsEstimate: row.body_fat_is_estimate,
    bodyFatPercent: row.body_fat_percent === null ? null : Number(row.body_fat_percent),
    createdAt: row.created_at,
    entryDate: normalizeDate(row.entry_date),
    id: row.id,
    notes: row.notes,
    performanceMetrics: normalizePerformanceMetrics(row.performance_metrics),
    updatedAt: row.updated_at,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg)
  };
}

function normalizePerformanceMetrics(value: unknown): PerformanceMetric[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((metric): metric is Record<string, unknown> => (
      typeof metric === 'object' && metric !== null && !Array.isArray(metric)
    ))
    .map((metric) => ({
      name: typeof metric.name === 'string' ? metric.name : '',
      notes: typeof metric.notes === 'string' ? metric.notes : null,
      unit: typeof metric.unit === 'string' ? metric.unit : '',
      value: typeof metric.value === 'number' ? metric.value : Number(metric.value)
    }))
    .filter((metric) => metric.name && metric.unit && Number.isFinite(metric.value));
}

function normalizeDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}
