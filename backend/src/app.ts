import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { Pool } from 'pg';

import type { AppConfig } from './config';
import { HttpError } from './errors';
import { isAllowedBrowserOrigin } from './http/origin';
import { errorHandler } from './middleware/errorHandler';
import { createAuthRouter } from './routes/auth';
import { createCheckInsRouter } from './routes/checkIns';
import { createFoodLogRouter } from './routes/foodLog';
import { createHealthRouter } from './routes/health';
import { createPlanRouter } from './routes/plan';
import { createProgressRouter } from './routes/progress';
import { createProfileRouter } from './routes/profile';

const WEB_BUILD_DIR = path.resolve(__dirname, '../../dist');
const WEB_INDEX_PATH = path.join(WEB_BUILD_DIR, 'index.html');

function hasWebBuild(): boolean {
  return fs.existsSync(WEB_INDEX_PATH);
}

function isApiRequestPath(requestPath: string, apiBasePath: string): boolean {
  return requestPath === apiBasePath || requestPath.startsWith(`${apiBasePath}/`);
}

export function createApp(config: AppConfig, pool: Pool) {
  const app = express();
  const webBuildAvailable = hasWebBuild();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    config.apiBasePath,
    (req, res, next) =>
      cors({
        credentials: true,
        origin(origin, callback) {
          if (isAllowedBrowserOrigin(req, config, origin)) {
            callback(null, true);
            return;
          }

          callback(new HttpError(403, 'CORS_ORIGIN_DENIED', 'Origin is not allowed.'));
        }
      })(req, res, next)
  );

  app.use(config.apiBasePath, createAuthRouter(config, pool));
  app.use(config.apiBasePath, createProfileRouter(config, pool));
  app.use(config.apiBasePath, createPlanRouter(config, pool));
  app.use(config.apiBasePath, createProgressRouter(config, pool));
  app.use(config.apiBasePath, createFoodLogRouter(config, pool));
  app.use(config.apiBasePath, createCheckInsRouter(config, pool));
  app.use(config.apiBasePath, createHealthRouter(pool));

  if (webBuildAvailable) {
    app.use(express.static(WEB_BUILD_DIR, { index: false }));
    app.use((req, res, next) => {
      if (isApiRequestPath(req.path, config.apiBasePath)) {
        next();
        return;
      }

      if (req.method !== 'GET' || !req.accepts('html')) {
        next();
        return;
      }

      res.sendFile(WEB_INDEX_PATH);
    });
  }

  app.use(config.apiBasePath, (_req, _res, next) => {
    next(new HttpError(404, 'NOT_FOUND', 'Route not found.'));
  });

  app.use(errorHandler);

  return app;
}
