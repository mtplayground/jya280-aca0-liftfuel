import { Linking, Platform } from 'react-native';

import { ApiError, apiClient } from '../../api/client';
import { classifyAuthSessionFailure } from '../../api/errorMessages';
import type { AuthSessionFailure } from '../../api/errorMessages';
import type { AuthSessionResponse, PasswordResetResponse } from '../../api/types';
import {
  clearSessionSnapshot,
  readSessionSnapshot,
  saveSessionSnapshot
} from './sessionStorage';
import type { StoredSessionSnapshot } from './types';

export type AuthSessionRefreshResult =
  | { session: AuthSessionResponse; status: 'authenticated' }
  | { failure: AuthSessionFailure; status: 'failed' };

export async function getStoredSession(): Promise<StoredSessionSnapshot | null> {
  return readSessionSnapshot();
}

export async function startSignIn(returnTo = '/'): Promise<void> {
  await Linking.openURL(apiClient.url('/auth/login', { returnTo }));
}

export async function startSignUp(returnTo = '/'): Promise<void> {
  await Linking.openURL(apiClient.url('/auth/signup', { returnTo }));
}

export async function hasAuthReturnParameters(): Promise<boolean> {
  return hasAuthReturnParameter(await readCurrentUrl());
}

export async function refreshSession(): Promise<AuthSessionResponse | null> {
  try {
    return await fetchAndStoreSession();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearSessionSnapshotAfterFailure();
      return null;
    }

    throw error;
  }
}

export async function refreshSessionForAuthFlow(): Promise<AuthSessionRefreshResult> {
  try {
    return {
      session: await fetchAndStoreSession(),
      status: 'authenticated'
    };
  } catch (error) {
    const failure = classifyAuthSessionFailure(error);
    if (failure.reason === 'session_not_recognized') {
      await clearSessionSnapshotAfterFailure();
    }

    return {
      failure,
      status: 'failed'
    };
  }
}

export function logAuthSessionRefreshFailure(
  source: string,
  failure: AuthSessionFailure
): void {
  console.warn('Auth session refresh failed', {
    code: failure.code,
    message: failure.message,
    reason: failure.reason,
    source,
    status: failure.status
  });
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

async function fetchAndStoreSession(): Promise<AuthSessionResponse> {
  const session = await apiClient.get<AuthSessionResponse>('/auth/me');
  await saveSessionSnapshot(session);
  return session;
}

async function clearSessionSnapshotAfterFailure(): Promise<void> {
  try {
    await clearSessionSnapshot();
  } catch (error) {
    console.warn('Unable to clear stored auth session snapshot', {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function readCurrentUrl(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.href;
  }

  return Linking.getInitialURL();
}

function hasAuthReturnParameter(url: string | null): boolean {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);
    return containsAuthReturnParameter(parsedUrl.searchParams)
      || containsAuthReturnParameter(new URLSearchParams(parsedUrl.hash.replace(/^#/, '')));
  } catch {
    return false;
  }
}

function containsAuthReturnParameter(params: URLSearchParams): boolean {
  return authReturnParameterNames.some((name) => params.has(name));
}

const authReturnParameterNames = [
  'auth',
  'code',
  'error',
  'error_description',
  'mctai_session',
  'session',
  'session_state',
  'state'
];
