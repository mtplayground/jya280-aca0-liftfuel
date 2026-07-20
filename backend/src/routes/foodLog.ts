import type { RequestHandler, Router } from 'express';
import { Router as createRouter } from 'express';
import multer from 'multer';
import type { Pool } from 'pg';

import { resolveAuthenticatedSession } from '../auth';
import type { AppConfig } from '../config';
import { HttpError } from '../errors';
import type {
  DailyFoodAggregation,
  DailyFoodTotals,
  FoodEntry,
  FoodItem,
  MacroTargets,
  PlanTargetDay,
  TrainingDayResolution
} from '../models';
import { AccountRepository, FoodLogRepository, ProfileRepository } from '../repositories';
import {
  calculateNutritionPlan,
  createObjectStorageService,
  formatWeekday,
  hasObjectStorageConfig,
  MealPhotoEstimationService,
  resolveTrainingDay
} from '../services';
import { readSearchQuery, validateFoodEntryPayload } from '../validation/foodLogValidation';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const allowedPhotoTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]);

const upload = multer({
  limits: {
    fileSize: MAX_PHOTO_BYTES,
    files: 1
  },
  storage: multer.memoryStorage()
});

const uploadMealPhotoFile: RequestHandler = (req, res, next) => {
  upload.single('photo')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      next(new HttpError(413, 'PHOTO_TOO_LARGE', 'Meal photos must be 8 MB or smaller.'));
      return;
    }

    next(error);
  });
};

export function createFoodLogRouter(config: AppConfig, pool: Pool): Router {
  const router = createRouter();
  const accounts = new AccountRepository(pool);
  const foodLog = new FoodLogRepository(pool);
  const profiles = new ProfileRepository(pool);
  const estimator = new MealPhotoEstimationService(config);

  router.get('/daily-totals', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const profile = await profiles.findByAccountId(session.account.id);
      if (!profile) {
        throw new HttpError(404, 'PROFILE_REQUIRED', 'Complete the profile before calculating daily totals.');
      }

      const date = readLogDate(req.query.date);
      const plan = calculateNutritionPlan(profile);
      const day = resolveTrainingDay(plan, date);
      const aggregation = await foodLog.aggregateDay(session.account.id, date);

      res.status(200).json(serializeDailyTotals(aggregation, day));
    } catch (error) {
      next(error);
    }
  });

  router.get('/foods/search', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const query = readSearchQuery(req.query.q);
      const items = await foodLog.searchFoodItems(query);

      res.status(200).json({
        items: items.map(serializeFoodItem)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/food-entries', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const payload = validateFoodEntryPayload(req.body);
      const day = await foodLog.ensureDay(session.account.id, payload.logDate);
      const entry = await foodLog.createEntry(session.account.id, day.id, payload.input);

      res.status(201).json({
        entry: serializeFoodEntry(entry)
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/food-entries/:entryId', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const foodEntryId = readRouteParam(req.params.entryId, 'entryId');
      const existingEntry = await foodLog.findEntryById(session.account.id, foodEntryId);
      if (!existingEntry) {
        throw new HttpError(404, 'FOOD_ENTRY_NOT_FOUND', 'Food entry was not found.');
      }

      const payload = validateFoodEntryPayload(req.body);
      const day = await foodLog.ensureDay(session.account.id, payload.logDate);
      const entry = await foodLog.updateEntry(
        session.account.id,
        existingEntry.id,
        day.id,
        payload.input
      );

      res.status(200).json({
        entry: serializeFoodEntry(entry)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/food-estimates/photo', uploadMealPhotoFile, async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const file = req.file;
      if (!file) {
        throw new HttpError(400, 'PHOTO_REQUIRED', 'A meal photo file is required.');
      }

      if (!allowedPhotoTypes.has(file.mimetype)) {
        throw new HttpError(400, 'UNSUPPORTED_IMAGE_TYPE', 'Use a JPEG, PNG, WebP, HEIC, or HEIF image.');
      }

      const estimate = await estimator.estimate({
        body: file.buffer,
        contentType: file.mimetype
      });

      res.status(200).json({ estimate });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/food-entries/:entryId/photo',
    uploadMealPhotoFile,
    async (req, res, next) => {
      try {
        const session = await resolveAuthenticatedSession(req, config, accounts);
        if (!session) {
          throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
        }

        if (!hasObjectStorageConfig(config)) {
          throw new HttpError(503, 'OBJECT_STORAGE_NOT_CONFIGURED', 'Object storage is not configured.');
        }

        const file = req.file;
        if (!file) {
          throw new HttpError(400, 'PHOTO_REQUIRED', 'A meal photo file is required.');
        }

        if (!allowedPhotoTypes.has(file.mimetype)) {
          throw new HttpError(400, 'UNSUPPORTED_IMAGE_TYPE', 'Use a JPEG, PNG, WebP, HEIC, or HEIF image.');
        }

        const foodEntryId = readRouteParam(req.params.entryId, 'entryId');
        const foodEntry = await foodLog.findEntryById(session.account.id, foodEntryId);
        if (!foodEntry) {
          throw new HttpError(404, 'FOOD_ENTRY_NOT_FOUND', 'Food entry was not found.');
        }

        const storage = createObjectStorageService(config);
        const uploaded = await storage.uploadMealPhoto({
          accountId: session.account.id,
          body: file.buffer,
          contentLength: file.buffer.length,
          contentType: file.mimetype,
          foodEntryId: foodEntry.id
        });

        const updatedEntry = await foodLog.attachPhoto(session.account.id, foodEntry.id, {
          byteSize: uploaded.byteSize,
          contentType: uploaded.contentType,
          objectKey: uploaded.objectKey,
          uploadedAt: new Date()
        });

        res.status(201).json({
          entry: serializeFoodEntry(updatedEntry),
          photo: {
            byteSize: uploaded.byteSize,
            contentType: uploaded.contentType,
            objectKey: uploaded.objectKey
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

function readRouteParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'INVALID_ROUTE_PARAM', `${name} is required.`);
  }

  return value;
}

function readLogDate(value: unknown): string {
  if (value === undefined) {
    return new Date().toISOString().slice(0, 10);
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'LOG_DATE_INVALID', 'Date must be in YYYY-MM-DD format.');
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, 'LOG_DATE_INVALID', 'Date must be a valid calendar date.');
  }

  return value;
}

export function serializeDailyTotals(
  aggregation: DailyFoodAggregation,
  day: TrainingDayResolution
) {
  const remaining = calculateRemaining(aggregation.totals, day.target);
  const progress = calculateProgress(aggregation.totals, day.target);
  const status = calculateOnTrackStatus(aggregation.totals, day.target);

  return {
    date: aggregation.date,
    dayType: day.dayType,
    entryCount: aggregation.entryCount,
    progress,
    remaining,
    splitFocus: day.splitFocus,
    status,
    target: serializePlanTargetDay(day.target),
    totals: serializeMacroTotals(aggregation.totals),
    trainingDayIndex: day.trainingDayIndex,
    weekday: day.weekday,
    weekdayName: formatWeekday(day.weekday)
  };
}

function calculateRemaining(totals: DailyFoodTotals, target: MacroTargets): DailyFoodTotals {
  return {
    caloriesKcal: round(target.caloriesKcal - totals.caloriesKcal, 0),
    carbsGrams: round(target.carbsGrams - totals.carbsGrams, 1),
    fatGrams: round(target.fatGrams - totals.fatGrams, 1),
    proteinGrams: round(target.proteinGrams - totals.proteinGrams, 1)
  };
}

function calculateProgress(totals: DailyFoodTotals, target: MacroTargets) {
  return {
    calories: calculateRatio(totals.caloriesKcal, target.caloriesKcal),
    carbs: calculateRatio(totals.carbsGrams, target.carbsGrams),
    fat: calculateRatio(totals.fatGrams, target.fatGrams),
    protein: calculateRatio(totals.proteinGrams, target.proteinGrams)
  };
}

function calculateOnTrackStatus(totals: DailyFoodTotals, target: MacroTargets) {
  const calorieRatio = calculateRatio(totals.caloriesKcal, target.caloriesKcal);
  const macroRatios = [
    calculateRatio(totals.proteinGrams, target.proteinGrams),
    calculateRatio(totals.carbsGrams, target.carbsGrams),
    calculateRatio(totals.fatGrams, target.fatGrams)
  ];

  if (calorieRatio > 1.05 || macroRatios.some((ratio) => ratio > 1.15)) {
    return {
      label: 'Over target',
      state: 'over_target'
    };
  }

  if (calorieRatio >= 0.9 && macroRatios.every((ratio) => ratio >= 0.8 && ratio <= 1.15)) {
    return {
      label: 'On track',
      state: 'on_track'
    };
  }

  return {
    label: 'Below target',
    state: 'below_target'
  };
}

function calculateRatio(total: number, target: number): number {
  if (target <= 0) {
    return total > 0 ? 1 : 0;
  }

  return round(total / target, 3);
}

function serializePlanTargetDay(target: PlanTargetDay) {
  return {
    dayType: target.dayType,
    ...serializeMacroTotals(target)
  };
}

function serializeMacroTotals(target: MacroTargets) {
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

function serializeFoodEntry(entry: FoodEntry) {
  return {
    id: entry.id,
    accountId: entry.accountId,
    foodLogDayId: entry.foodLogDayId,
    name: entry.name,
    caloriesKcal: entry.caloriesKcal,
    proteinGrams: entry.proteinGrams,
    carbsGrams: entry.carbsGrams,
    fatGrams: entry.fatGrams,
    quantityValue: entry.quantityValue,
    quantityUnit: entry.quantityUnit,
    mealType: entry.mealType,
    consumedAt: entry.consumedAt.toISOString(),
    source: entry.source,
    notes: entry.notes,
    photoByteSize: entry.photoByteSize,
    photoContentType: entry.photoContentType,
    photoObjectKey: entry.photoObjectKey,
    photoUploadedAt: entry.photoUploadedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString()
  };
}

function serializeFoodItem(item: FoodItem) {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    servingQuantity: item.servingQuantity,
    servingUnit: item.servingUnit,
    caloriesKcal: item.caloriesKcal,
    proteinGrams: item.proteinGrams,
    carbsGrams: item.carbsGrams,
    fatGrams: item.fatGrams
  };
}
