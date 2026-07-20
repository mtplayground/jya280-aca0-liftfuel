import type { Router } from 'express';
import { Router as createRouter } from 'express';
import type { Pool } from 'pg';

import { resolveAuthenticatedSession } from '../auth';
import type { AppConfig } from '../config';
import { HttpError } from '../errors';
import type { PerformanceMetric, ProgressEntry } from '../models';
import { AccountRepository, ProgressRepository } from '../repositories';
import {
  validateProgressEntryInput,
  validateProgressQuery
} from '../validation/progressValidation';

export function createProgressRouter(config: AppConfig, pool: Pool): Router {
  const router = createRouter();
  const accounts = new AccountRepository(pool);
  const progress = new ProgressRepository(pool);

  router.get('/progress', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const query = validateProgressQuery(req.query);
      const entries = await progress.list(session.account.id, query);

      res.status(200).json({
        entries: entries.map(serializeProgressEntry)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/progress/:entryDate', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const entryDate = readRouteDate(req.params.entryDate);
      const entry = await progress.findByDate(session.account.id, entryDate);

      res.status(200).json({
        entry: entry ? serializeProgressEntry(entry) : null
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/progress/:entryDate', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const entryDate = readRouteDate(req.params.entryDate);
      const input = validateProgressEntryInput({
        ...readObjectBody(req.body),
        entryDate
      });
      const entry = await progress.upsert(session.account.id, input);

      res.status(200).json({
        entry: serializeProgressEntry(entry)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/progress', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const input = validateProgressEntryInput(req.body);
      const entry = await progress.upsert(session.account.id, input);

      res.status(201).json({
        entry: serializeProgressEntry(entry)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function readObjectBody(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpError(400, 'PROGRESS_INVALID', 'Progress payload is required.');
  }

  return value as Record<string, unknown>;
}

function readRouteDate(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'PROGRESS_DATE_INVALID', 'Date must be in YYYY-MM-DD format.');
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, 'PROGRESS_DATE_INVALID', 'Date must be a valid calendar date.');
  }

  return value;
}

function serializeProgressEntry(entry: ProgressEntry) {
  return {
    id: entry.id,
    accountId: entry.accountId,
    bodyFatIsEstimate: entry.bodyFatIsEstimate,
    bodyFatPercent: entry.bodyFatPercent,
    createdAt: entry.createdAt.toISOString(),
    entryDate: entry.entryDate,
    notes: entry.notes,
    performanceMetrics: entry.performanceMetrics.map(serializePerformanceMetric),
    updatedAt: entry.updatedAt.toISOString(),
    weightKg: entry.weightKg
  };
}

function serializePerformanceMetric(metric: PerformanceMetric) {
  return {
    name: metric.name,
    notes: metric.notes,
    unit: metric.unit,
    value: metric.value
  };
}
