import { createHash } from 'node:crypto';

import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

import type { AppConfig } from '../config';
import { HttpError } from '../errors';
import type { AccountRepository } from '../repositories';
import type { MctaiSessionClaims } from './claims';

type AuthenticatedSession = {
  account: Awaited<ReturnType<AccountRepository['upsertAccount']>>['account'];
  claims: MctaiSessionClaims;
  isNewAccount: boolean;
  session: Awaited<ReturnType<AccountRepository['upsertSession']>>;
};

function requireAuthConfig(config: AppConfig) {
  if (!config.authUrl || !config.authAppToken || !config.authJwksUrl) {
    throw new HttpError(503, 'AUTH_NOT_CONFIGURED', 'Authentication is not configured.');
  }

  return {
    appToken: config.authAppToken,
    jwksUrl: config.authJwksUrl,
    url: config.authUrl
  };
}

export function buildAuthLoginUrl(config: AppConfig, returnTo: string): string {
  const auth = requireAuthConfig(config);
  const url = new URL('/login', auth.url);
  url.searchParams.set('app_token', auth.appToken);
  url.searchParams.set('return_to', returnTo);

  return url.toString();
}

export async function resolveAuthenticatedSession(
  req: Request,
  config: AppConfig,
  accounts: AccountRepository
): Promise<AuthenticatedSession | null> {
  const token = readSessionCookie(req);
  if (!token) return null;

  const claims = await verifySessionCookie(token, config);
  if (!claims.email) {
    throw new HttpError(401, 'SESSION_EMAIL_MISSING', 'Authenticated session is missing an email claim.');
  }

  const accountResult = await accounts.upsertAccount({
    authSubject: claims.sub,
    displayName: claims.name ?? null,
    email: claims.email,
    emailVerified: claims.email_verified ?? false,
    pictureUrl: claims.picture ?? null
  });

  const session = await accounts.upsertSession({
    accountId: accountResult.account.id,
    expiresAt: claims.exp ? new Date(claims.exp * 1000) : null,
    issuedAt: claims.iat ? new Date(claims.iat * 1000) : undefined,
    sessionKeyHash: hashSessionToken(token)
  });

  return {
    account: accountResult.account,
    claims,
    isNewAccount: accountResult.isNewAccount,
    session
  };
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function readSessionCookie(req: Request): string | null {
  const token = req.cookies?.mctai_session;
  return typeof token === 'string' && token ? token : null;
}

async function verifySessionCookie(token: string, config: AppConfig): Promise<MctaiSessionClaims> {
  const auth = requireAuthConfig(config);
  const jwks = jwksClient({ jwksUri: auth.jwksUrl });

  return new Promise<MctaiSessionClaims>((resolve, reject) => {
    jwt.verify(
      token,
      async (header, callback) => {
        try {
          if (!header.kid) {
            callback(new Error('Session token is missing a key id.'));
            return;
          }

          const key = await jwks.getSigningKey(header.kid);
          callback(null, key.getPublicKey());
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Unable to read auth signing key.'));
        }
      },
      {
        audience: auth.appToken,
        issuer: auth.url
      },
      (error, decoded) => {
        if (error) {
          reject(new HttpError(401, 'INVALID_SESSION', 'Session is invalid or expired.'));
          return;
        }

        if (!decoded || typeof decoded === 'string' || !decoded.sub) {
          reject(new HttpError(401, 'INVALID_SESSION_CLAIMS', 'Session claims are invalid.'));
          return;
        }

        resolve(decoded as MctaiSessionClaims);
      }
    );
  });
}
