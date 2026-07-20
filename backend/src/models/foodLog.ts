export const mealTypeValues = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export const foodEntrySourceValues = ['photo_estimate', 'manual'] as const;

export type MealType = (typeof mealTypeValues)[number];
export type FoodEntrySource = (typeof foodEntrySourceValues)[number];

export type FoodLogDay = {
  id: string;
  accountId: string;
  logDate: string;
  createdAt: Date;
  updatedAt: Date;
};

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
  consumedAt: Date;
  source: FoodEntrySource;
  notes: string | null;
  photoByteSize: number | null;
  photoContentType: string | null;
  photoObjectKey: string | null;
  photoUploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FoodEntryInput = {
  name: string;
  caloriesKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  quantityValue: number;
  quantityUnit: string;
  mealType: MealType;
  consumedAt: Date;
  source: FoodEntrySource;
  notes?: string | null;
};

export type FoodEntryPhotoInput = {
  byteSize: number;
  contentType: string;
  objectKey: string;
  uploadedAt: Date;
};
