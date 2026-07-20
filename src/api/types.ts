export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export type ApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  timeoutMs?: number;
};

export type HealthResponse = {
  database: {
    latencyMs?: number;
    message?: string;
    status: 'ok' | 'unavailable';
  };
  service: 'liftfuel-api';
  status: 'ok' | 'degraded';
  timestamp: string;
};

export type AuthAccount = {
  id: string;
  authSubject: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  pictureUrl: string | null;
};

export type AuthSession = {
  expiresAt: string | null;
  id: string;
  lastSeenAt: string;
};

export type AuthSessionResponse = {
  account: AuthAccount;
  isNewAccount: boolean;
  session: AuthSession;
};

export type PasswordResetRequest = {
  email: string;
  returnTo?: string;
};

export type PasswordResetResponse = {
  delivery: 'sent' | 'skipped';
  status: 'accepted';
};

export type Sex = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'cut' | 'bulk' | 'maintain';
export type TrainingSplit =
  | 'full_body'
  | 'upper_lower'
  | 'push_pull_legs'
  | 'body_part'
  | 'sport_specific'
  | 'custom';

export type UserProfile = {
  accountId: string;
  activityLevel: ActivityLevel;
  ageYears: number;
  bodyFatIsEstimate: boolean;
  bodyFatPercent: number | null;
  createdAt: string;
  goal: Goal;
  heightCm: number;
  sex: Sex;
  trainingDaysPerWeek: number;
  trainingSplit: TrainingSplit;
  updatedAt: string;
  weightKg: number;
};

export type ProfileInput = {
  activityLevel: ActivityLevel;
  ageYears: number;
  bodyFatIsEstimate: true;
  bodyFatPercent: number | null;
  goal: Goal;
  heightCm: number;
  sex: Sex;
  trainingDaysPerWeek: number;
  trainingSplit: TrainingSplit;
  weightKg: number;
};

export type ProfileResponse = {
  profile: UserProfile | null;
};

export type MacroTargets = {
  caloriesKcal: number;
  carbsGrams: number;
  fatGrams: number;
  proteinGrams: number;
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

export type PlanResponse = {
  plan: NutritionPlan;
};

export type TrainingDayResolution = {
  date: string;
  dayType: 'training' | 'rest';
  splitFocus: string | null;
  target: PlanTargetDay;
  trainingDayIndex: number | null;
  weekday: number;
  weekdayName: string;
};

export type PlanDayResponse = {
  day: TrainingDayResolution;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodEntrySource = 'photo_estimate' | 'manual';

export type FoodEntry = {
  id: string;
  accountId: string;
  foodLogDayId: string;
  name: string;
  caloriesKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  quantityValue: number;
  quantityUnit: string;
  mealType: MealType;
  consumedAt: string;
  source: FoodEntrySource;
  notes: string | null;
  photoByteSize: number | null;
  photoContentType: string | null;
  photoObjectKey: string | null;
  photoUploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MealPhotoUploadResponse = {
  entry: FoodEntry;
  photo: {
    byteSize: number;
    contentType: string;
    objectKey: string;
  };
};

export type MealPhotoEstimate = {
  caloriesKcal: number;
  carbsGrams: number;
  confidence: 'low' | 'medium' | 'high';
  correctionPrompts: string[];
  fatGrams: number;
  items: string[];
  name: string;
  proteinGrams: number;
  quantityDescription: string;
};

export type MealPhotoEstimateResponse = {
  estimate: MealPhotoEstimate;
};

export type FoodItem = {
  id: string;
  name: string;
  brand: string | null;
  servingQuantity: number;
  servingUnit: string;
  caloriesKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export type FoodSearchResponse = {
  items: FoodItem[];
};

export type FoodEntryInput = {
  caloriesKcal: number;
  carbsGrams: number;
  consumedAt: string;
  fatGrams: number;
  logDate: string;
  mealType: MealType;
  name: string;
  notes: string | null;
  proteinGrams: number;
  quantityUnit: string;
  quantityValue: number;
  source: FoodEntrySource;
};

export type FoodEntryResponse = {
  entry: FoodEntry;
};

export type DailyTotalsStatus = {
  label: string;
  state: 'below_target' | 'on_track' | 'over_target';
};

export type DailyTotalsResponse = {
  date: string;
  dayType: 'training' | 'rest';
  entryCount: number;
  progress: {
    calories: number;
    carbs: number;
    fat: number;
    protein: number;
  };
  remaining: MacroTargets;
  splitFocus: string | null;
  status: DailyTotalsStatus;
  target: PlanTargetDay;
  totals: MacroTargets;
  trainingDayIndex: number | null;
  weekday: number;
  weekdayName: string;
};

export type CheckInStatusState = 'below_target' | 'on_track' | 'over_target';

export type DailyCheckIn = {
  id: string;
  accountId: string;
  checkedInAt: string;
  checkInDate: string;
  createdAt: string;
  loggedFood: boolean;
  onTrack: boolean;
  onTrackState: CheckInStatusState;
  target: MacroTargets;
  totals: MacroTargets;
  updatedAt: string;
};

export type StreakSummary = {
  currentLoggingStreakDays: number;
  currentOnTrackStreakDays: number;
  lastCheckInDate: string | null;
  longestLoggingStreakDays: number;
  longestOnTrackStreakDays: number;
  recentCheckIns: DailyCheckIn[];
};

export type DailyCheckInRequest = {
  date?: string;
};

export type DailyCheckInResponse = {
  checkIn: DailyCheckIn;
  streaks: StreakSummary;
};

export type StreakSummaryResponse = {
  streaks: StreakSummary;
};
