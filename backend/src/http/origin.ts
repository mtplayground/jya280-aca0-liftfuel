import type { Request } from 'express';

import type { AppConfig } from '../config';

export function resolvePublicOrigin(req: Request, config: AppConfig): string {
  const forwardedHost = firstForwardedValue(req.get('x-forwarded-host'));
  const forwardedProto = firstForwardedValue(req.get('x-forwarded-proto'));

  if (forwardedHost) {
    return `${forwardedProto ?? req.protocol}://${forwardedHost}`.replace(/\/$/, '');
  }

  if (config.selfUrl) {
    return config.selfUrl.replace(/\/$/, '');
  }

  const host = req.get('host') ?? `localhost:${config.port}`;
  return `${req.protocol}://${host}`.replace(/\/$/, '');
}

export function isAllowedBrowserOrigin(
  req: Request,
  config: AppConfig,
  origin: string | undefined
): boolean {
  if (!origin) return true;

  const originHost = parseOriginHost(origin);
  if (!originHost) return false;

  const publicHost = parseOriginHost(resolvePublicOrigin(req, config));
  if (originHost === publicHost) return true;

  return configuredOriginHosts(config).has(originHost);
}

function configuredOriginHosts(config: AppConfig): Set<string> {
  return new Set(
    [config.allowedCorsOrigin, config.selfUrl]
      .flatMap((value) => value?.split(',') ?? [])
      .map((value) => parseOriginHost(value.trim()))
      .filter((value): value is string => Boolean(value))
  );
}

function parseOriginHost(value: string): string | null {
  if (!value) return null;

  try {
    return new URL(value).host.toLowerCase().replace(/:\d+$/, '');
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, '').replace(/:\d+$/, '') || null;
  }
}

function firstForwardedValue(value: string | undefined): string | undefined {
  return value
    ?.split(',')
    .map((part) => part.trim())
    .find(Boolean);
}
