import { Linking } from 'react-native';

import { ApiError, apiClient } from '../../api/client';
import type { AuthSessionResponse, PasswordResetResponse } from '../../api/types';
import {
  clearSessionSnapshot,
  readSessionSnapshot,
  saveSessionSnapshot
} from './sessionStorage';
import type { StoredSessionSnapshot } from './types';

export async function getStoredSession(): Promise<StoredSessionSnapshot | null> {
  return readSessionSnapshot();
}

export async function startSignIn(returnTo = '/'): Promise<void> {
  await Linking.openURL(apiClient.url('/auth/login', { returnTo }));
}

export async function startSignUp(returnTo = '/'): Promise<void> {
  await Linking.openURL(apiClient.url('/auth/signup', { returnTo }));
}

export async function refreshSession(): Promise<AuthSessionResponse | null> {
  try {
    const session = await apiClient.get<AuthSessionResponse>('/auth/me');
    await saveSessionSnapshot(session);
    return session;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearSessionSnapshot();
      return null;
    }

    throw error;
  }
}

export async function signOut(): Promise<void> {
  await apiClient.post<void>('/auth/logout', undefined);
  await clearSessionSnapshot();
}

export async function requestPasswordReset(
  email: string,
  returnTo = '/'
): Promise<PasswordResetResponse> {
  return apiClient.post<PasswordResetResponse>('/auth/password-reset', { email, returnTo });
}
