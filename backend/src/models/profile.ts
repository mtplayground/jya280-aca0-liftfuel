export const sexValues = ['female', 'male', 'non_binary', 'prefer_not_to_say'] as const;
export const activityLevelValues = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
export const goalValues = ['cut', 'bulk', 'maintain'] as const;
export const trainingSplitValues = [
  'full_body',
  'upper_lower',
  'push_pull_legs',
  'body_part',
  'sport_specific',
  'custom'
] as const;

export type Sex = (typeof sexValues)[number];
export type ActivityLevel = (typeof activityLevelValues)[number];
export type Goal = (typeof goalValues)[number];
export type TrainingSplit = (typeof trainingSplitValues)[number];

export type UserProfile = {
  accountId: string;
  activityLevel: ActivityLevel;
  ageYears: number;
  bodyFatIsEstimate: boolean;
  bodyFatPercent: number | null;
  createdAt: Date;
  goal: Goal;
  heightCm: number;
  sex: Sex;
  trainingDaysPerWeek: number;
  trainingSplit: TrainingSplit;
  updatedAt: Date;
  weightKg: number;
};

export type ProfileInput = {
  activityLevel: ActivityLevel;
  ageYears: number;
  bodyFatIsEstimate: boolean;
  bodyFatPercent: number | null;
  goal: Goal;
  heightCm: number;
  sex: Sex;
  trainingDaysPerWeek: number;
  trainingSplit: TrainingSplit;
  weightKg: number;
};
