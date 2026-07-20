import { Pool } from 'pg';

import type { AppConfig } from './config';

export type DatabaseStatus = {
  latencyMs: number;
  status: 'ok';
};

export function createDatabasePool(config: AppConfig): Pool {
  return new Pool({
    connectionString: normalizePostgresConnectionString(config.databaseUrl),
    max: config.databaseMaxConnections
  });
}

export async function checkDatabase(pool: Pool): Promise<DatabaseStatus> {
  const startedAt = Date.now();
  await pool.query('SELECT 1');

  return {
    latencyMs: Date.now() - startedAt,
    status: 'ok'
  };
}

function normalizePostgresConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get('sslmode');
    if (sslMode && !url.searchParams.has('uselibpqcompat')) {
      url.searchParams.set('uselibpqcompat', 'true');
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}
