export type AppConfig = {
  apiBasePath: string;
  allowedCorsOrigin?: string;
  databaseMaxConnections: number;
  databaseUrl: string;
  host: string;
  isProduction: boolean;
  nodeEnv: string;
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

function readInteger(env: Env, key: string, fallback: number): number {
  const rawValue = readOptionalString(env, key);
  if (!rawValue) return fallback;

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${key} must be a positive integer`);
  }

  return value;
}

function normalizeBasePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/api';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function loadConfig(env: Env = process.env): AppConfig {
  const nodeEnv = readOptionalString(env, 'NODE_ENV') ?? 'development';

  return {
    apiBasePath: normalizeBasePath(readOptionalString(env, 'API_BASE_PATH') ?? '/api'),
    allowedCorsOrigin: readOptionalString(env, 'ALLOWED_CORS_ORIGIN'),
    databaseMaxConnections: readInteger(env, 'DATABASE_MAX_CONNECTIONS', 5),
    databaseUrl: readRequiredString(env, 'DATABASE_URL'),
    host: readOptionalString(env, 'HOST') ?? '0.0.0.0',
    isProduction: nodeEnv === 'production',
    nodeEnv,
    port: readInteger(env, 'PORT', 8080),
    selfUrl: readOptionalString(env, 'SELF_URL')
  };
}
