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
