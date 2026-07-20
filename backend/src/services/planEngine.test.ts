import assert from 'node:assert/strict';
import test from 'node:test';

import type { UserProfile } from '../models';
import { calculateNutritionPlan } from './planEngine';

const profile: UserProfile = {
  accountId: 'account-1',
  activityLevel: 'moderate',
  ageYears: 30,
  bodyFatIsEstimate: false,
  bodyFatPercent: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  goal: 'cut',
  heightCm: 180,
  sex: 'male',
  trainingDaysPerWeek: 4,
  trainingSplit: 'upper_lower',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  weightKg: 80
};

test('calculateNutritionPlan derives cut targets without body fat percent', () => {
  const plan = calculateNutritionPlan(profile);

  assert.equal(plan.baseline.bmrKcal, 1780);
  assert.equal(plan.baseline.maintenanceCaloriesKcal, 2759);
  assert.equal(plan.baseline.targetAverageCaloriesKcal, 2345);
  assert.equal(plan.trainingDaysPerWeek, 4);
  assert.equal(plan.restDaysPerWeek, 3);
  assert.deepEqual(plan.trainingDay, {
    caloriesKcal: 2535,
    carbsGrams: 345,
    dayType: 'training',
    fatGrams: 50,
    proteinGrams: 176
  });
  assert.deepEqual(plan.restDay, {
    caloriesKcal: 2090,
    carbsGrams: 207,
    dayType: 'rest',
    fatGrams: 62,
    proteinGrams: 176
  });
});

test('calculateNutritionPlan changes calorie and macro targets when goal changes', () => {
  const cutPlan = calculateNutritionPlan(profile);
  const bulkPlan = calculateNutritionPlan({
    ...profile,
    bodyFatPercent: 18,
    goal: 'bulk'
  });

  assert.equal(cutPlan.goal, 'cut');
  assert.equal(bulkPlan.goal, 'bulk');
  assert.equal(bulkPlan.baseline.maintenanceCaloriesKcal, cutPlan.baseline.maintenanceCaloriesKcal);
  assert.equal(bulkPlan.baseline.targetAverageCaloriesKcal, 3035);
  assert.equal(bulkPlan.trainingDay.caloriesKcal, 3280);
  assert.equal(bulkPlan.restDay.caloriesKcal, 2710);
  assert.equal(bulkPlan.trainingDay.proteinGrams, 160);
  assert.equal(bulkPlan.trainingDay.fatGrams, 58);
  assert.ok(bulkPlan.trainingDay.carbsGrams > cutPlan.trainingDay.carbsGrams);
});

test('calculateNutritionPlan clamps invalid training frequency into weekly bounds', () => {
  const noTrainingPlan = calculateNutritionPlan({
    ...profile,
    trainingDaysPerWeek: -2
  });
  const everyDayPlan = calculateNutritionPlan({
    ...profile,
    trainingDaysPerWeek: 9
  });

  assert.equal(noTrainingPlan.trainingDaysPerWeek, 0);
  assert.equal(noTrainingPlan.restDaysPerWeek, 7);
  assert.equal(noTrainingPlan.trainingDay.caloriesKcal, noTrainingPlan.baseline.targetAverageCaloriesKcal);
  assert.equal(noTrainingPlan.restDay.caloriesKcal, noTrainingPlan.baseline.targetAverageCaloriesKcal);
  assert.equal(everyDayPlan.trainingDaysPerWeek, 7);
  assert.equal(everyDayPlan.restDaysPerWeek, 0);
  assert.equal(everyDayPlan.trainingDay.caloriesKcal, everyDayPlan.baseline.targetAverageCaloriesKcal);
});
