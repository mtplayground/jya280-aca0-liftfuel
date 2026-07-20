import assert from 'node:assert/strict';
import test from 'node:test';

import type { NutritionPlan } from '../models';
import { formatWeekday, resolveTrainingDay } from './trainingSchedule';

const plan: NutritionPlan = {
  baseline: {
    activityMultiplier: 1.55,
    bmrKcal: 1780,
    maintenanceCaloriesKcal: 2759,
    targetAverageCaloriesKcal: 2345
  },
  goal: 'cut',
  restDay: {
    caloriesKcal: 2090,
    carbsGrams: 207,
    dayType: 'rest',
    fatGrams: 62,
    proteinGrams: 176
  },
  restDaysPerWeek: 3,
  trainingDay: {
    caloriesKcal: 2535,
    carbsGrams: 345,
    dayType: 'training',
    fatGrams: 50,
    proteinGrams: 176
  },
  trainingDaysPerWeek: 4,
  trainingSplit: 'upper_lower'
};

test('resolveTrainingDay returns a training target and split focus for scheduled weekdays', () => {
  const day = resolveTrainingDay(plan, '2026-07-20');

  assert.equal(day.date, '2026-07-20');
  assert.equal(day.weekday, 1);
  assert.equal(formatWeekday(day.weekday), 'Monday');
  assert.equal(day.dayType, 'training');
  assert.equal(day.trainingDayIndex, 0);
  assert.equal(day.splitFocus, 'Upper');
  assert.equal(day.target, plan.trainingDay);
});

test('resolveTrainingDay returns rest target for off days', () => {
  const day = resolveTrainingDay(plan, '2026-07-22');

  assert.equal(day.weekday, 3);
  assert.equal(day.dayType, 'rest');
  assert.equal(day.trainingDayIndex, null);
  assert.equal(day.splitFocus, null);
  assert.equal(day.target, plan.restDay);
});

test('resolveTrainingDay cycles split focus when frequency exceeds split length', () => {
  const day = resolveTrainingDay(
    {
      ...plan,
      restDaysPerWeek: 2,
      trainingDaysPerWeek: 5,
      trainingSplit: 'push_pull_legs'
    },
    '2026-07-25'
  );

  assert.equal(day.weekday, 6);
  assert.equal(day.dayType, 'training');
  assert.equal(day.trainingDayIndex, 4);
  assert.equal(day.splitFocus, 'Pull');
});

test('resolveTrainingDay treats zero weekly training days as rest days', () => {
  const day = resolveTrainingDay(
    {
      ...plan,
      restDaysPerWeek: 7,
      trainingDaysPerWeek: 0
    },
    '2026-07-20'
  );

  assert.equal(day.dayType, 'rest');
  assert.equal(day.trainingDayIndex, null);
  assert.equal(day.target, plan.restDay);
});
