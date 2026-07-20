import type { AuthSessionResponse } from '../../api';

export type StoredSessionSnapshot = AuthSessionResponse & {
  storedAt: string;
};
