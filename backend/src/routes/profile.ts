import type { Router } from 'express';
import { Router as createRouter } from 'express';
import type { Pool } from 'pg';

import { resolveAuthenticatedSession } from '../auth';
import type { AppConfig } from '../config';
import { HttpError } from '../errors';
import type { UserProfile } from '../models';
import { AccountRepository, ProfileRepository } from '../repositories';
import { validateProfileInput } from '../validation/profileValidation';

export function createProfileRouter(config: AppConfig, pool: Pool): Router {
  const router = createRouter();
  const accounts = new AccountRepository(pool);
  const profiles = new ProfileRepository(pool);

  router.get('/profile', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const profile = await profiles.findByAccountId(session.account.id);
      res.status(200).json({
        profile: profile ? serializeProfile(profile) : null
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/profile', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const input = validateProfileInput(req.body);
      const profile = await profiles.upsert(session.account.id, input);

      res.status(200).json({
        profile: serializeProfile(profile)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function serializeProfile(profile: UserProfile) {
  return {
    accountId: profile.accountId,
    activityLevel: profile.activityLevel,
    ageYears: profile.ageYears,
    bodyFatIsEstimate: profile.bodyFatIsEstimate,
    bodyFatPercent: profile.bodyFatPercent,
    createdAt: profile.createdAt.toISOString(),
    goal: profile.goal,
    heightCm: profile.heightCm,
    sex: profile.sex,
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    trainingSplit: profile.trainingSplit,
    updatedAt: profile.updatedAt.toISOString(),
    weightKg: profile.weightKg
  };
}
