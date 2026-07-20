import type { Request, Router } from 'express';
import { Router as createRouter } from 'express';
import type { Pool } from 'pg';

import {
  buildAuthLoginUrl,
  hashSessionToken,
  readSessionCookie,
  resolveAuthenticatedSession
} from '../auth';
import type { AppConfig } from '../config';
import { HttpError } from '../errors';
import { AccountRepository } from '../repositories';
import { sendEmail } from '../services';

type PasswordResetBody = {
  email?: unknown;
  returnTo?: unknown;
};

export function createAuthRouter(config: AppConfig, pool: Pool): Router {
  const router = createRouter();
  const accounts = new AccountRepository(pool);

  router.get('/auth/login', (req, res, next) => {
    try {
      res.redirect(buildAuthLoginUrl(config, resolveReturnTo(req, config, readReturnToQuery(req))));
    } catch (error) {
      next(error);
    }
  });

  router.get('/auth/signup', (req, res, next) => {
    try {
      res.redirect(buildAuthLoginUrl(config, resolveReturnTo(req, config, readReturnToQuery(req))));
    } catch (error) {
      next(error);
    }
  });

  router.get('/auth/me', async (req, res, next) => {
    try {
      const session = await resolveAuthenticatedSession(req, config, accounts);
      if (!session) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required.');
      }

      res.status(200).json({
        account: {
          authSubject: session.account.authSubject,
          displayName: session.account.displayName,
          email: session.account.email,
          emailVerified: session.account.emailVerified,
          id: session.account.id,
          pictureUrl: session.account.pictureUrl
        },
        isNewAccount: session.isNewAccount,
        session: {
          expiresAt: session.session.expiresAt?.toISOString() ?? null,
          id: session.session.id,
          lastSeenAt: session.session.lastSeenAt.toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/logout', async (req, res, next) => {
    try {
      const token = readSessionCookie(req);
      if (token) {
        await accounts.revokeSession(hashSessionToken(token));
      }

      res.clearCookie('mctai_session', {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: config.isProduction
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/password-reset', async (req, res, next) => {
    try {
      const body = req.body as PasswordResetBody;
      const email = parseEmail(body.email);
      const returnTo = resolveReturnTo(req, config, body.returnTo);
      const loginUrl = buildAuthLoginUrl(config, returnTo);

      const result = await sendEmail(config, {
        html: [
          '<p>Use the secure LiftFuel sign-in link below to access your account.</p>',
          `<p><a href="${escapeHtml(loginUrl)}">Open LiftFuel sign-in</a></p>`,
          '<p>If you did not request account access, you can ignore this email.</p>'
        ].join(''),
        subject: 'LiftFuel account access',
        text: `Open LiftFuel sign-in: ${loginUrl}`,
        to: email
      });

      res.status(202).json({
        delivery: result.delivery,
        status: 'accepted'
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function parseEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'EMAIL_REQUIRED', 'Email is required.');
  }

  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'EMAIL_INVALID', 'Email must be valid.');
  }

  return email;
}

function resolveReturnTo(req: Request, config: AppConfig, requested?: unknown): string {
  const origin = publicOrigin(req, config);
  const fallback = `${origin}/`;

  if (typeof requested !== 'string' || !requested.trim()) {
    return fallback;
  }

  try {
    const url = new URL(requested, origin);
    if (url.origin !== origin || url.pathname.startsWith(config.apiBasePath)) {
      return fallback;
    }

    return url.toString();
  } catch {
    return fallback;
  }
}

function readReturnToQuery(req: Request): unknown {
  return req.query.returnTo ?? req.query.return_to;
}

function publicOrigin(req: Request, config: AppConfig): string {
  if (config.selfUrl) {
    return config.selfUrl.replace(/\/$/, '');
  }

  const host = req.get('x-forwarded-host') ?? req.get('host') ?? `localhost:${config.port}`;
  const proto = req.get('x-forwarded-proto') ?? req.protocol;
  return `${proto}://${host}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
