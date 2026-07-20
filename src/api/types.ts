export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export type ApiClientOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  timeoutMs?: number;
};

export type HealthResponse = {
  database: {
    latencyMs?: number;
    message?: string;
    status: 'ok' | 'unavailable';
  };
  service: 'liftfuel-api';
  status: 'ok' | 'degraded';
  timestamp: string;
};

export type AuthAccount = {
  id: string;
  authSubject: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  pictureUrl: string | null;
};

export type AuthSession = {
  expiresAt: string | null;
  id: string;
  lastSeenAt: string;
};

export type AuthSessionResponse = {
  account: AuthAccount;
  isNewAccount: boolean;
  session: AuthSession;
};

export type PasswordResetRequest = {
  email: string;
  returnTo?: string;
};

export type PasswordResetResponse = {
  delivery: 'sent' | 'skipped';
  status: 'accepted';
};
