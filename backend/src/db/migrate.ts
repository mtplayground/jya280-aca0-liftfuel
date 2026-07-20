import 'dotenv/config';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { PoolClient } from 'pg';

import { loadConfig } from '../config';
import { createDatabasePool } from '../db';

type MigrationFile = {
  name: string;
  path: string;
  version: string;
};

const migrationsDirectory = path.resolve(process.cwd(), 'backend/migrations');

async function listMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await fs.readdir(migrationsDirectory);

  return entries
    .filter((entry) => entry.endsWith('.sql'))
    .sort()
    .map((name) => ({
      name,
      path: path.join(migrationsDirectory, name),
      version: name.replace(/\.sql$/, '')
    }));
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function readAppliedVersions(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<{ version: string }>(
    'SELECT version FROM schema_migrations'
  );

  return new Set(result.rows.map((row) => row.version));
}

async function runMigration(client: PoolClient, migration: MigrationFile): Promise<void> {
  const sql = await fs.readFile(migration.path, 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [migration.version, migration.name]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const config = loadConfig();
  const pool = createDatabasePool(config);
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const appliedVersions = await readAppliedVersions(client);
    const migrations = await listMigrationFiles();

    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        console.info(`Skipping applied migration ${migration.name}`);
        continue;
      }

      console.info(`Applying migration ${migration.name}`);
      await runMigration(client, migration);
    }

    console.info('Database migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Database migration failed', {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : typeof error,
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});
