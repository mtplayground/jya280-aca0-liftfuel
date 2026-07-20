export type UserAccount = {
  id: string;
  authSubject: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  pictureUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
};

export type UserSession = {
  id: string;
  accountId: string;
  sessionKeyHash: string;
  identityProvider: 'mctai';
  issuedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
};

export type UpsertAccountInput = {
  authSubject: string;
  email: string;
  emailVerified: boolean;
  displayName?: string | null;
  pictureUrl?: string | null;
};

export type UpsertAccountResult = {
  account: UserAccount;
  isNewAccount: boolean;
};

export type UpsertSessionInput = {
  accountId: string;
  sessionKeyHash: string;
  expiresAt?: Date | null;
  issuedAt?: Date;
};
