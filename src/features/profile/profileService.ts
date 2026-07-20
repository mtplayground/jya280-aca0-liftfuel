import { apiClient } from '../../api/client';
import type { ProfileInput, ProfileResponse, UserProfile } from '../../api/types';

export async function getProfile(): Promise<UserProfile | null> {
  const response = await apiClient.get<ProfileResponse>('/profile');
  return response.profile;
}

export async function saveProfile(input: ProfileInput): Promise<UserProfile> {
  const response = await apiClient.put<ProfileResponse>('/profile', input);
  if (!response.profile) {
    throw new Error('The profile response did not include a saved profile.');
  }

  return response.profile;
}
