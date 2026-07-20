import { apiClient } from '../../api/client';
import type {
  DailyTotalsResponse,
  FoodEntry,
  FoodEntryInput,
  FoodEntryResponse,
  FoodItem,
  FoodSearchResponse
} from '../../api/types';

export async function searchFoods(query: string): Promise<FoodItem[]> {
  const response = await apiClient.get<FoodSearchResponse>(
    `/foods/search?q=${encodeURIComponent(query.trim())}`
  );

  return response.items;
}

export async function createFoodEntry(input: FoodEntryInput): Promise<FoodEntry> {
  const response = await apiClient.post<FoodEntryResponse>('/food-entries', input);
  return response.entry;
}

export async function updateFoodEntry(entryId: string, input: FoodEntryInput): Promise<FoodEntry> {
  const response = await apiClient.put<FoodEntryResponse>(`/food-entries/${entryId}`, input);
  return response.entry;
}

export async function getDailyTotals(date?: string): Promise<DailyTotalsResponse> {
  const path = date ? `/daily-totals?date=${encodeURIComponent(date)}` : '/daily-totals';
  return apiClient.get<DailyTotalsResponse>(path);
}
