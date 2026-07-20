import { apiClient } from '../../api/client';
import type {
  NutritionPlan,
  PlanDayResponse,
  PlanResponse,
  TrainingDayResolution
} from '../../api/types';

export async function getNutritionPlan(): Promise<NutritionPlan> {
  const response = await apiClient.get<PlanResponse>('/plan');
  return response.plan;
}

export async function getPlanDay(date?: string): Promise<TrainingDayResolution> {
  const path = date ? `/plan/day?date=${encodeURIComponent(date)}` : '/plan/day';
  const response = await apiClient.get<PlanDayResponse>(path);
  return response.day;
}
