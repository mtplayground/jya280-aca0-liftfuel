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
