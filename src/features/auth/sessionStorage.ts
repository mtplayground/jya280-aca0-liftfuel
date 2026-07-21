import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AuthSessionResponse } from '../../api';
import type { StoredSessionSnapshot } from './types';

const SESSION_STORAGE_KEY = 'liftfuel.session.snapshot';

type SessionSnapshotStorage = {
  deleteItem(key: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const nativeSessionStorage: SessionSnapshotStorage = {
  async deleteItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
  }
};

const webSessionStorage: SessionSnapshotStorage = {
  async deleteItem(key: string): Promise<void> {
    try {
      getBrowserStorage()?.removeItem(key);
    } catch {
      // Browser storage can be disabled by user settings; clearing should remain best-effort.
    }
  },
  async getItem(key: string): Promise<string | null> {
    try {
      return getBrowserStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      getBrowserStorage()?.setItem(key, value);
    } catch {
      // Keep auth flows usable even when localStorage is unavailable or quota-limited.
    }
  }
};

function getSessionStorage(): SessionSnapshotStorage {
  return Platform.OS === 'web' ? webSessionStorage : nativeSessionStorage;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function saveSessionSnapshot(
  session: AuthSessionResponse
): Promise<StoredSessionSnapshot> {
  const snapshot: StoredSessionSnapshot = {
    ...session,
    storedAt: new Date().toISOString()
  };

  await getSessionStorage().setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));

  return snapshot;
}

export async function readSessionSnapshot(): Promise<StoredSessionSnapshot | null> {
  const rawValue = await getSessionStorage().getItem(SESSION_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as StoredSessionSnapshot;
  } catch {
    await clearSessionSnapshot();
    return null;
  }
}

export async function clearSessionSnapshot(): Promise<void> {
  await getSessionStorage().deleteItem(SESSION_STORAGE_KEY);
}
