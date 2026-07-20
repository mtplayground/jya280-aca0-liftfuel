import * as SecureStore from 'expo-secure-store';

import type { AuthSessionResponse } from '../../api';
import type { StoredSessionSnapshot } from './types';

const SESSION_STORAGE_KEY = 'liftfuel.session.snapshot';

export async function saveSessionSnapshot(
  session: AuthSessionResponse
): Promise<StoredSessionSnapshot> {
  const snapshot: StoredSessionSnapshot = {
    ...session,
    storedAt: new Date().toISOString()
  };

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(snapshot), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });

  return snapshot;
}

export async function readSessionSnapshot(): Promise<StoredSessionSnapshot | null> {
  const rawValue = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as StoredSessionSnapshot;
  } catch {
    await clearSessionSnapshot();
    return null;
  }
}

export async function clearSessionSnapshot(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}
