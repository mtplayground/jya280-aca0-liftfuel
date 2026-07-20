import type { Pool, PoolClient } from 'pg';

import type {
  UpsertAccountInput,
  UpsertAccountResult,
  UpsertSessionInput,
  UserAccount,
  UserSession
} from '../models';

type Queryable = Pool | PoolClient;

type UserAccountRow = {
  auth_subject: string;
  created_at: Date;
  display_name: string | null;
  email: string;
  email_verified: boolean;
  id: string;
  is_new_account?: boolean;
  last_seen_at: Date;
  picture_url: string | null;
  updated_at: Date;
};

type UserSessionRow = {
  account_id: string;
  created_at: Date;
  expires_at: Date | null;
  id: string;
  identity_provider: 'mctai';
  issued_at: Date;
  last_seen_at: Date;
  revoked_at: Date | null;
  session_key_hash: string;
  updated_at: Date;
};

export class AccountRepository {
  constructor(private readonly db: Queryable) {}

  async upsertAccount(input: UpsertAccountInput): Promise<UpsertAccountResult> {
    const result = await this.db.query<UserAccountRow>(
      `
        INSERT INTO user_accounts (
          auth_subject,
          email,
          email_verified,
          display_name,
          picture_url
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (auth_subject)
        DO UPDATE SET
          email = EXCLUDED.email,
          email_verified = EXCLUDED.email_verified,
          display_name = EXCLUDED.display_name,
          picture_url = EXCLUDED.picture_url,
          last_seen_at = NOW()
        RETURNING *, (xmax = 0) AS is_new_account
      `,
      [
        input.authSubject,
        input.email,
        input.emailVerified,
        input.displayName ?? null,
        input.pictureUrl ?? null
      ]
    );

    const row = requireSingleRow(result.rows, 'user account upsert');

    return {
      account: mapAccount(row),
      isNewAccount: row.is_new_account ?? false
    };
  }

  async findAccountByAuthSubject(authSubject: string): Promise<UserAccount | null> {
    const result = await this.db.query<UserAccountRow>(
      'SELECT * FROM user_accounts WHERE auth_subject = $1',
      [authSubject]
    );

    return result.rows[0] ? mapAccount(result.rows[0]) : null;
  }

  async upsertSession(input: UpsertSessionInput): Promise<UserSession> {
    const result = await this.db.query<UserSessionRow>(
      `
        INSERT INTO user_sessions (
          account_id,
          session_key_hash,
          issued_at,
          expires_at
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (session_key_hash)
        DO UPDATE SET
          account_id = EXCLUDED.account_id,
          expires_at = EXCLUDED.expires_at,
          last_seen_at = NOW(),
          revoked_at = NULL
        RETURNING *
      `,
      [
        input.accountId,
        input.sessionKeyHash,
        input.issuedAt ?? new Date(),
        input.expiresAt ?? null
      ]
    );

    return mapSession(requireSingleRow(result.rows, 'user session upsert'));
  }

  async revokeSession(sessionKeyHash: string): Promise<UserSession | null> {
    const result = await this.db.query<UserSessionRow>(
      `
        UPDATE user_sessions
        SET revoked_at = NOW()
        WHERE session_key_hash = $1
        RETURNING *
      `,
      [sessionKeyHash]
    );

    return result.rows[0] ? mapSession(result.rows[0]) : null;
  }
}

function mapAccount(row: UserAccountRow): UserAccount {
  return {
    id: row.id,
    authSubject: row.auth_subject,
    email: row.email,
    emailVerified: row.email_verified,
    displayName: row.display_name,
    pictureUrl: row.picture_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at
  };
}

function mapSession(row: UserSessionRow): UserSession {
  return {
    id: row.id,
    accountId: row.account_id,
    sessionKeyHash: row.session_key_hash,
    identityProvider: row.identity_provider,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at
  };
}

function requireSingleRow<TRow>(rows: TRow[], operation: string): TRow {
  const row = rows[0];
  if (!row) {
    throw new Error(`Expected ${operation} to return a row`);
  }

  return row;
}
