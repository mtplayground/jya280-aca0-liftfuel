import { Platform } from 'react-native';

import type { ApiClientOptions, ApiErrorBody, RequestOptions } from './types';

declare const process:
  | {
      env?: {
        EXPO_PUBLIC_API_BASE_URL?: string;
      };
    }
  | undefined;

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_NATIVE_API_BASE_URL = 'http://localhost:8080/api';

function readConfiguredBaseUrl(): string {
  const configuredBaseUrl = process?.env?.EXPO_PUBLIC_API_BASE_URL;
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }

  return DEFAULT_NATIVE_API_BASE_URL;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
    this.status = status;
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? readConfiguredBaseUrl());
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  url(path: string, query: Record<string, string | undefined> = {}): string {
    const url = new URL(`${this.baseUrl}${normalizePath(path)}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  async get<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
    return this.request<TResponse>(path, {
      ...options,
      method: 'GET'
    });
  }

  async post<TResponse>(
    path: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<TResponse> {
    return this.request<TResponse>(path, {
      ...options,
      body,
      method: 'POST'
    });
  }

  async put<TResponse>(
    path: string,
    body: unknown,
    options: RequestOptions = {}
  ): Promise<TResponse> {
    return this.request<TResponse>(path, {
      ...options,
      body,
      method: 'PUT'
    });
  }

  async request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${normalizePath(path)}`, {
        ...options,
        body: serializeBody(options.body),
        credentials: options.credentials ?? 'include',
        headers: buildHeaders(options),
        signal: controller.signal
      });

      if (!response.ok) {
        throw await this.toApiError(response);
      }

      if (response.status === 204) {
        return undefined as TResponse;
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(408, 'REQUEST_TIMEOUT', 'The request timed out.');
      }

      throw new ApiError(0, 'NETWORK_ERROR', 'The API request could not be completed.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async toApiError(response: Response): Promise<ApiError> {
    const fallbackMessage = `Request failed with status ${response.status}.`;

    try {
      const body = (await response.json()) as ApiErrorBody;
      return new ApiError(
        response.status,
        body.error?.code ?? 'API_ERROR',
        body.error?.message ?? fallbackMessage
      );
    } catch {
      return new ApiError(response.status, 'API_ERROR', fallbackMessage);
    }
  }
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof body === 'string' || body instanceof FormData) return body;
  return JSON.stringify(body);
}

function buildHeaders(options: RequestOptions): HeadersInit {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  return headers;
}

export const apiClient = new ApiClient();
