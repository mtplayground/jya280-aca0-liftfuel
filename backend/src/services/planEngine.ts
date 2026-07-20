import type { ActivityLevel, Goal, MacroTargets, NutritionPlan, UserProfile } from '../models';

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const goalAdjustments: Record<Goal, number> = {
  bulk: 1.1,
  cut: 0.85,
  maintain: 1
};

const proteinGramsPerKg: Record<Goal, number> = {
  bulk: 2,
  cut: 2.2,
  maintain: 1.8
};

const fatGramsPerKg: Record<Goal, number> = {
  bulk: 0.8,
  cut: 0.7,
  maintain: 0.8
};

export function calculateNutritionPlan(profile: UserProfile): NutritionPlan {
  const trainingDaysPerWeek = clampInteger(profile.trainingDaysPerWeek, 0, 7);
  const restDaysPerWeek = 7 - trainingDaysPerWeek;
  const bmrKcal = calculateBmr(profile);
  const maintenanceCaloriesKcal = Math.round(bmrKcal * activityMultipliers[profile.activityLevel]);
  const targetAverageCaloriesKcal = Math.round(maintenanceCaloriesKcal * goalAdjustments[profile.goal]);
  const trainingCaloriesKcal = calculateTrainingCalories(
    targetAverageCaloriesKcal,
    trainingDaysPerWeek,
    restDaysPerWeek
  );
  const restCaloriesKcal = calculateRestCalories(
    targetAverageCaloriesKcal,
    trainingCaloriesKcal,
    trainingDaysPerWeek,
    restDaysPerWeek
  );

  return {
    baseline: {
      activityMultiplier: activityMultipliers[profile.activityLevel],
      bmrKcal: Math.round(bmrKcal),
      maintenanceCaloriesKcal,
      targetAverageCaloriesKcal
    },
    goal: profile.goal,
    restDay: {
      dayType: 'rest',
      ...calculateMacroTargets(profile, restCaloriesKcal, 'rest')
    },
    restDaysPerWeek,
    trainingDay: {
      dayType: 'training',
      ...calculateMacroTargets(profile, trainingCaloriesKcal, 'training')
    },
    trainingDaysPerWeek,
    trainingSplit: profile.trainingSplit
  };
}

function calculateBmr(profile: UserProfile): number {
  const sexAdjustment = profile.sex === 'male'
    ? 5
    : profile.sex === 'female'
      ? -161
      : -78;

  return (10 * profile.weightKg) + (6.25 * profile.heightCm) - (5 * profile.ageYears) + sexAdjustment;
}

function calculateTrainingCalories(
  targetAverageCaloriesKcal: number,
  trainingDaysPerWeek: number,
  restDaysPerWeek: number
): number {
  if (trainingDaysPerWeek === 0) {
    return targetAverageCaloriesKcal;
  }

  if (restDaysPerWeek === 0) {
    return targetAverageCaloriesKcal;
  }

  return roundToNearest(targetAverageCaloriesKcal * 1.08, 5);
}

function calculateRestCalories(
  targetAverageCaloriesKcal: number,
  trainingCaloriesKcal: number,
  trainingDaysPerWeek: number,
  restDaysPerWeek: number
): number {
  if (restDaysPerWeek === 0) {
    return targetAverageCaloriesKcal;
  }

  const weeklyTarget = targetAverageCaloriesKcal * 7;
  const restDayTarget = (weeklyTarget - (trainingCaloriesKcal * trainingDaysPerWeek)) / restDaysPerWeek;
  return roundToNearest(Math.max(restDayTarget, targetAverageCaloriesKcal * 0.75), 5);
}

function calculateMacroTargets(
  profile: UserProfile,
  caloriesKcal: number,
  dayType: 'training' | 'rest'
): MacroTargets {
  const proteinGrams = roundToNearest(profile.weightKg * proteinGramsPerKg[profile.goal], 1);
  const baseFatGrams = profile.weightKg * fatGramsPerKg[profile.goal];
  const fatMultiplier = dayType === 'training' ? 0.9 : 1.1;
  const fatGrams = roundToNearest(baseFatGrams * fatMultiplier, 1);
  const remainingCalories = Math.max(caloriesKcal - (proteinGrams * 4) - (fatGrams * 9), 0);
  const carbsGrams = roundToNearest(remainingCalories / 4, 1);

  return {
    caloriesKcal,
    carbsGrams,
    fatGrams,
    proteinGrams
  };
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(Math.round(value), minimum), maximum);
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}
