import assert from 'node:assert/strict';
import test from 'node:test';

import type { DailyFoodAggregation, TrainingDayResolution } from '../models';
import { serializeDailyTotals } from './foodLog';

const day: TrainingDayResolution = {
  date: '2026-07-20',
  dayType: 'training',
  splitFocus: 'Upper',
  target: {
    caloriesKcal: 2000,
    carbsGrams: 200,
    dayType: 'training',
    fatGrams: 60,
    proteinGrams: 150
  },
  trainingDayIndex: 0,
  weekday: 1
};

test('serializeDailyTotals handles zero entries as below target with full remaining targets', () => {
  const response = serializeDailyTotals(zeroAggregation(), day);

  assert.equal(response.entryCount, 0);
  assert.deepEqual(response.totals, {
    caloriesKcal: 0,
    carbsGrams: 0,
    fatGrams: 0,
    proteinGrams: 0
  });
  assert.deepEqual(response.remaining, {
    caloriesKcal: 2000,
    carbsGrams: 200,
    fatGrams: 60,
    proteinGrams: 150
  });
  assert.deepEqual(response.progress, {
    calories: 0,
    carbs: 0,
    fat: 0,
    protein: 0
  });
  assert.deepEqual(response.status, {
    label: 'Below target',
    state: 'below_target'
  });
  assert.equal(response.weekdayName, 'Monday');
});

test('serializeDailyTotals marks a balanced day as on track', () => {
  const response = serializeDailyTotals(
    {
      date: '2026-07-20',
      entryCount: 3,
      totals: {
        caloriesKcal: 1800,
        carbsGrams: 180,
        fatGrams: 54,
        proteinGrams: 120
      }
    },
    day
  );

  assert.deepEqual(response.progress, {
    calories: 0.9,
    carbs: 0.9,
    fat: 0.9,
    protein: 0.8
  });
  assert.deepEqual(response.status, {
    label: 'On track',
    state: 'on_track'
  });
});

test('serializeDailyTotals marks calorie or macro overages as over target', () => {
  const response = serializeDailyTotals(
    {
      date: '2026-07-20',
      entryCount: 4,
      totals: {
        caloriesKcal: 2101,
        carbsGrams: 240,
        fatGrams: 61,
        proteinGrams: 151
      }
    },
    day
  );

  assert.equal(response.progress.calories, 1.051);
  assert.deepEqual(response.status, {
    label: 'Over target',
    state: 'over_target'
  });
  assert.equal(response.remaining.caloriesKcal, -101);
});

function zeroAggregation(): DailyFoodAggregation {
  return {
    date: '2026-07-20',
    entryCount: 0,
    totals: {
      caloriesKcal: 0,
      carbsGrams: 0,
      fatGrams: 0,
      proteinGrams: 0
    }
  };
}
