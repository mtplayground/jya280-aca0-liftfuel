import type { Router } from 'express';
import { Router as createRouter } from 'express';
import type { Pool } from 'pg';

import { resolveAuthenticatedSession } from '../auth';
import type { AppConfig } from '../config';
import { HttpError } from '../errors';
import type {
  CheckInStatusState,
  DailyCheckIn,
  DailyFoodTotals,
  MacroTargets,
  StreakSummary
} from '../models';
import {
  AccountRepository,
  FoodLogRepository,
  ProfileRepository,
  StreakRepository
} from '../repositories';
import { calculateNutritionPlan, resolveTrainingDay } from '../services';

export function createCheckInsRouter(config: AppConfig, pool: Pool): Router {
  const router = createRouter();
  const accounts = new AccountRepository(pool);
  const foodLog = new FoodLogRepository(pool);
  const profiles = new ProfileRepository(pool);
  const streaks = new StreakRepository(pool);

  router.post('/check-ins/daily', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const profile = await profiles.findByAccountId(session.account.id);
      if (!profile) {
        throw new HttpError(404, 'PROFILE_REQUIRED', 'Complete the profile before checking in.');
      }

      const date = readDateFromBody(req.body);
      const plan = calculateNutritionPlan(profile);
      const day = resolveTrainingDay(plan, date);
      const aggregation = await foodLog.aggregateDay(session.account.id, date);
      const onTrackState = calculateOnTrackState(aggregation.totals, day.target);
      const checkIn = await streaks.upsertDailyCheckIn({
        accountId: session.account.id,
        checkedInAt: new Date(),
        checkInDate: date,
        loggedFood: aggregation.entryCount > 0,
        onTrack: onTrackState === 'on_track',
        onTrackState,
        target: day.target,
        totals: aggregation.totals
      });
      const summary = await streaks.getSummary(session.account.id, date);

      res.status(201).json({
        checkIn: serializeDailyCheckIn(checkIn),
        streaks: serializeStreakSummary(summary)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/check-ins/streaks', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const throughDate = readOptionalDate(req.query.through, 'through');
      const summary = await streaks.getSummary(session.account.id, throughDate);

      res.status(200).json({
        streaks: serializeStreakSummary(summary)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function readDateFromBody(value: unknown): string {
  if (value === undefined || value === null) {
    return new Date().toISOString().slice(0, 10);
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'CHECK_IN_INVALID', 'Check-in payload must be an object.');
  }

  return readOptionalDate((value as Record<string, unknown>).date, 'date');
}

function readOptionalDate(value: unknown, field: string): string {
  if (value === undefined) {
    return new Date().toISOString().slice(0, 10);
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'CHECK_IN_DATE_INVALID', `${field} must be in YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, 'CHECK_IN_DATE_INVALID', `${field} must be a valid calendar date.`);
  }

  return value;
}

function calculateOnTrackState(
  totals: DailyFoodTotals,
  target: MacroTargets
): CheckInStatusState {
  const calorieRatio = calculateRatio(totals.caloriesKcal, target.caloriesKcal);
  const macroRatios = [
    calculateRatio(totals.proteinGrams, target.proteinGrams),
    calculateRatio(totals.carbsGrams, target.carbsGrams),
    calculateRatio(totals.fatGrams, target.fatGrams)
  ];

  if (calorieRatio > 1.05 || macroRatios.some((ratio) => ratio > 1.15)) {
    return 'over_target';
  }

  if (calorieRatio >= 0.9 && macroRatios.every((ratio) => ratio >= 0.8 && ratio <= 1.15)) {
    return 'on_track';
  }

  return 'below_target';
}

function calculateRatio(total: number, target: number): number {
  if (target <= 0) {
    return total > 0 ? 1 : 0;
  }

  return total / target;
}

function serializeStreakSummary(summary: StreakSummary) {
  return {
    currentLoggingStreakDays: summary.currentLoggingStreakDays,
    currentOnTrackStreakDays: summary.currentOnTrackStreakDays,
    lastCheckInDate: summary.lastCheckInDate,
    longestLoggingStreakDays: summary.longestLoggingStreakDays,
    longestOnTrackStreakDays: summary.longestOnTrackStreakDays,
    recentCheckIns: summary.recentCheckIns.map(serializeDailyCheckIn)
  };
}

function serializeDailyCheckIn(checkIn: DailyCheckIn) {
  return {
    id: checkIn.id,
    accountId: checkIn.accountId,
    checkedInAt: checkIn.checkedInAt.toISOString(),
    checkInDate: checkIn.checkInDate,
    createdAt: checkIn.createdAt.toISOString(),
    loggedFood: checkIn.loggedFood,
    onTrack: checkIn.onTrack,
    onTrackState: checkIn.onTrackState,
    target: serializeMacroTargets(checkIn.target),
    totals: serializeMacroTargets(checkIn.totals),
    updatedAt: checkIn.updatedAt.toISOString()
  };
}

function serializeMacroTargets(target: MacroTargets) {
  return {
    caloriesKcal: round(target.caloriesKcal, 0),
    carbsGrams: round(target.carbsGrams, 1),
    fatGrams: round(target.fatGrams, 1),
    proteinGrams: round(target.proteinGrams, 1)
  };
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
