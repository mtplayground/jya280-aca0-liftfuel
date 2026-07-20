import type { Router } from 'express';
import { Router as createRouter } from 'express';
import type { Pool } from 'pg';

import { resolveAuthenticatedSession } from '../auth';
import type { AppConfig } from '../config';
import { HttpError } from '../errors';
import type { MacroTargets, NutritionPlan, PlanTargetDay } from '../models';
import { AccountRepository, ProfileRepository } from '../repositories';
import { calculateNutritionPlan } from '../services';

export function createPlanRouter(config: AppConfig, pool: Pool): Router {
  const router = createRouter();
  const accounts = new AccountRepository(pool);
  const profiles = new ProfileRepository(pool);

  router.get('/plan', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      const profile = await profiles.findByAccountId(session.account.id);
      if (!profile) {
        throw new HttpError(404, 'PROFILE_REQUIRED', 'Complete the profile before calculating a plan.');
      }

      res.status(200).json({
        plan: serializePlan(calculateNutritionPlan(profile))
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function serializePlan(plan: NutritionPlan) {
  return {
    baseline: plan.baseline,
    goal: plan.goal,
    restDay: serializePlanTargetDay(plan.restDay),
    restDaysPerWeek: plan.restDaysPerWeek,
    trainingDay: serializePlanTargetDay(plan.trainingDay),
    trainingDaysPerWeek: plan.trainingDaysPerWeek,
    trainingSplit: plan.trainingSplit
  };
}

function serializePlanTargetDay(target: PlanTargetDay) {
  return {
    dayType: target.dayType,
    ...serializeMacroTargets(target)
  };
}

function serializeMacroTargets(target: MacroTargets) {
  return {
    caloriesKcal: target.caloriesKcal,
    carbsGrams: target.carbsGrams,
    fatGrams: target.fatGrams,
    proteinGrams: target.proteinGrams
  };
}
