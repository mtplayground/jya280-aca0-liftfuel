import cors from 'cors';
import express from 'express';
import type { Pool } from 'pg';

import type { AppConfig } from './config';
import { HttpError } from './errors';
import { errorHandler } from './middleware/errorHandler';
import { createHealthRouter } from './routes/health';

function collectAllowedOrigins(config: AppConfig): Set<string> {
  return new Set(
    [config.allowedCorsOrigin, config.selfUrl]
      .filter((origin): origin is string => Boolean(origin))
      .map((origin) => origin.replace(/\/$/, ''))
  );
}

export function createApp(config: AppConfig, pool: Pool) {
  const app = express();
  const allowedOrigins = collectAllowedOrigins(config);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(express.json({ limit: '1mb' }));
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.size === 0) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = origin.replace(/\/$/, '');
        if (allowedOrigins.has(normalizedOrigin)) {
          callback(null, true);
          return;
        }

        callback(new HttpError(403, 'CORS_ORIGIN_DENIED', 'Origin is not allowed.'));
      }
    })
  );

  app.use(config.apiBasePath, createHealthRouter(pool));

  app.use(config.apiBasePath, (_req, _res, next) => {
    next(new HttpError(404, 'NOT_FOUND', 'Route not found.'));
  });

  app.use(errorHandler);

  return app;
}
