import type { Goal, TrainingSplit } from './profile';

export type MacroTargets = {
  caloriesKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export type PlanTargetDay = MacroTargets & {
  dayType: 'training' | 'rest';
};

export type NutritionPlan = {
  baseline: {
    activityMultiplier: number;
    bmrKcal: number;
    maintenanceCaloriesKcal: number;
    targetAverageCaloriesKcal: number;
  };
  goal: Goal;
  restDay: PlanTargetDay;
  restDaysPerWeek: number;
  trainingDay: PlanTargetDay;
  trainingDaysPerWeek: number;
  trainingSplit: TrainingSplit;
};

export type TrainingDayResolution = {
  date: string;
  dayType: 'training' | 'rest';
  splitFocus: string | null;
  target: PlanTargetDay;
  trainingDayIndex: number | null;
  weekday: number;
};
