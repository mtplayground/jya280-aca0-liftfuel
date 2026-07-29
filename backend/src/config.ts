export type AppConfig = {
  apiBasePath: string;
  allowedCorsOrigin?: string;
  authAppToken?: string;
  authCookieDomain?: string;
  authCookieSameSite?: 'lax' | 'none' | 'strict';
  authCookieSecure?: boolean;
  authJwksUrl?: string;
  authUrl?: string;
  databaseMaxConnections: number;
  databaseUrl: string;
  emailAppToken?: string;
  emailUrl?: string;
  host: string;
  isProduction: boolean;
  nodeEnv: string;
  objectStorageAccessKeyId?: string;
  objectStorageBucket?: string;
  objectStorageEndpoint?: string;
  objectStoragePrefix?: string;
  objectStorageRegion?: string;
  objectStorageSecretAccessKey?: string;
  openAiApiKey?: string;
  openAiModel: string;
  port: number;
  selfUrl?: string;
};

type Env = NodeJS.ProcessEnv;

function readOptionalString(env: Env, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

function readRequiredString(env: Env, key: string): string {
  const value = readOptionalString(env, key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readFirstOptionalString(env: Env, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readOptionalString(env, key);
    if (value) return value;
  }

  return undefined;
}

function readInteger(env: Env, key: string, fallback: number): number {
  const rawValue = readOptionalString(env, key);
  if (!rawValue) return fallback;

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${key} must be a positive integer`);
  }

  return value;
}

function readBoolean(env: Env, key: string): boolean | undefined {
  const rawValue = readOptionalString(env, key);
  if (!rawValue) return undefined;

  const normalized = rawValue.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  throw new Error(`${key} must be a boolean value`);
}

function readFirstBoolean(env: Env, keys: string[]): boolean | undefined {
  for (const key of keys) {
    if (readOptionalString(env, key)) return readBoolean(env, key);
  }

  return undefined;
}

function readCookieSameSite(
  env: Env,
  key: string
): AppConfig['authCookieSameSite'] | undefined {
  const rawValue = readOptionalString(env, key);
  if (!rawValue) return undefined;

  const normalized = rawValue.toLowerCase();
  if (normalized === 'lax' || normalized === 'none' || normalized === 'strict') {
    return normalized;
  }

  throw new Error(`${key} must be one of: lax, none, strict`);
}

function readFirstCookieSameSite(
  env: Env,
  keys: string[]
): AppConfig['authCookieSameSite'] | undefined {
  for (const key of keys) {
    if (readOptionalString(env, key)) return readCookieSameSite(env, key);
  }

  return undefined;
}

function normalizeBasePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/api';

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '');
}

export function loadConfig(env: Env = process.env): AppConfig {
  const nodeEnv = readOptionalString(env, 'NODE_ENV') ?? 'development';

  return {
    apiBasePath: normalizeBasePath(readOptionalString(env, 'API_BASE_PATH') ?? '/api'),
    allowedCorsOrigin: readOptionalString(env, 'ALLOWED_CORS_ORIGIN'),
    authAppToken: readFirstOptionalString(env, [
      'IDEAVIBES_AUTH_APP_TOKEN',
      'MCTAI_AUTH_APP_TOKEN'
    ]),
    authCookieDomain: readFirstOptionalString(env, [
      'IDEAVIBES_SESSION_COOKIE_DOMAIN',
      'MCTAI_SESSION_COOKIE_DOMAIN'
    ]),
    authCookieSameSite: readFirstCookieSameSite(env, [
      'IDEAVIBES_SESSION_COOKIE_SAMESITE',
      'MCTAI_SESSION_COOKIE_SAMESITE'
    ]),
    authCookieSecure: readFirstBoolean(env, [
      'IDEAVIBES_SESSION_COOKIE_SECURE',
      'MCTAI_SESSION_COOKIE_SECURE'
    ]),
    authJwksUrl: readFirstOptionalString(env, [
      'IDEAVIBES_AUTH_JWKS_URL',
      'MCTAI_AUTH_JWKS_URL'
    ]),
    authUrl: readFirstOptionalString(env, ['IDEAVIBES_AUTH_URL', 'MCTAI_AUTH_URL']),
    databaseMaxConnections: readInteger(env, 'DATABASE_MAX_CONNECTIONS', 5),
    databaseUrl: readRequiredString(env, 'DATABASE_URL'),
    emailAppToken: readFirstOptionalString(env, [
      'IDEAVIBES_EMAIL_APP_TOKEN',
      'MCTAI_EMAIL_APP_TOKEN'
    ]),
    emailUrl: readFirstOptionalString(env, ['IDEAVIBES_EMAIL_URL', 'MCTAI_EMAIL_URL']),
    host: readOptionalString(env, 'HOST') ?? '0.0.0.0',
    isProduction: nodeEnv === 'production',
    nodeEnv,
    objectStorageAccessKeyId: readOptionalString(env, 'OBJECT_STORAGE_ACCESS_KEY_ID'),
    objectStorageBucket: readOptionalString(env, 'OBJECT_STORAGE_BUCKET'),
    objectStorageEndpoint: readOptionalString(env, 'OBJECT_STORAGE_ENDPOINT'),
    objectStoragePrefix: readOptionalString(env, 'OBJECT_STORAGE_PREFIX'),
    objectStorageRegion: readOptionalString(env, 'OBJECT_STORAGE_REGION'),
    objectStorageSecretAccessKey: readOptionalString(env, 'OBJECT_STORAGE_SECRET_ACCESS_KEY'),
    openAiApiKey: readOptionalString(env, 'OPENAI_API_KEY'),
    openAiModel: readOptionalString(env, 'OPENAI_MODEL') ?? 'gpt-4o-mini',
    port: readInteger(env, 'PORT', 8080),
    selfUrl: readOptionalString(env, 'SELF_URL')
  };
}
