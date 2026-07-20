import type { Router } from 'express';
import { Router as createRouter } from 'express';
import type { Pool } from 'pg';

import { checkDatabase } from '../db';

type HealthStatus = {
  database: {
    latencyMs?: number;
    message?: string;
    status: 'ok' | 'unavailable';
  };
  service: 'liftfuel-api';
  status: 'ok' | 'degraded';
  timestamp: string;
};

export function createHealthRouter(pool: Pool): Router {
  const router = createRouter();

  router.get('/health', async (_req, res) => {
    const timestamp = new Date().toISOString();

    try {
      const database = await checkDatabase(pool);
      const body: HealthStatus = {
        database,
        service: 'liftfuel-api',
        status: 'ok',
        timestamp
      };

      return res.status(200).json(body);
    } catch (error) {
      const body: HealthStatus = {
        database: {
          message: error instanceof Error ? error.message : 'Database check failed',
          status: 'unavailable'
        },
        service: 'liftfuel-api',
        status: 'degraded',
        timestamp
      };

      return res.status(503).json(body);
    }
  });

  return router;
}
