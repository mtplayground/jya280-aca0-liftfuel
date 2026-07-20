import { apiClient } from '../../api/client';
import type { NutritionPlan, PlanResponse } from '../../api/types';

export async function getNutritionPlan(): Promise<NutritionPlan> {
  const response = await apiClient.get<PlanResponse>('/plan');
  return response.plan;
}
