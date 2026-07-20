import type { JwtPayload } from 'jsonwebtoken';

export type MctaiSessionClaims = JwtPayload & {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  sub: string;
};
