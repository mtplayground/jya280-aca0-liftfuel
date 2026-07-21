import { ApiError } from './client';

export type AuthSessionFailureReason =
  | 'auth_not_configured'
  | 'network_or_cors'
  | 'session_not_recognized'
  | 'unknown';

export type AuthSessionFailure = {
  code: string;
  message: string;
  reason: AuthSessionFailureReason;
  status: number;
};

export function readAppErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Network unavailable. Check your connection and try again.';
      case 'REQUEST_TIMEOUT':
        return 'The request timed out. Try again when the connection is stable.';
      case 'PROFILE_REQUIRED':
        return 'Complete your profile before using plan targets and daily summaries.';
      case 'AI_ESTIMATION_FAILED':
      case 'AI_ESTIMATION_EMPTY':
      case 'AI_ESTIMATION_INVALID':
      case 'AI_ESTIMATION_NOT_CONFIGURED':
        return 'AI estimation is unavailable right now. Enter or search the meal manually.';
      case 'OBJECT_STORAGE_NOT_CONFIGURED':
        return 'Photo storage is unavailable right now. The meal can still be saved without a photo.';
      case 'PHOTO_TOO_LARGE':
        return 'The photo is too large. Use an image that is 8 MB or smaller.';
      case 'UNSUPPORTED_IMAGE_TYPE':
        return 'Use a JPEG, PNG, WebP, HEIC, or HEIF image.';
      case 'UNAUTHENTICATED':
        return 'Sign in again to continue.';
      case 'AUTH_NOT_CONFIGURED':
        return 'Sign-in is unavailable right now. Try again later.';
      default:
        return error.message || fallback;
    }
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

export function classifyAuthSessionFailure(error: unknown): AuthSessionFailure {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      reason: classifyAuthSessionApiError(error),
      status: error.status
    };
  }

  return {
    code: 'UNKNOWN_AUTH_SESSION_ERROR',
    message: error instanceof Error ? error.message : 'Unknown session refresh error.',
    reason: 'unknown',
    status: 0
  };
}

export function readAuthSessionFailureMessage(failure: AuthSessionFailure): string {
  switch (failure.reason) {
    case 'session_not_recognized':
      return 'Your sign-in could not be verified. Please try signing in again.';
    case 'network_or_cors':
      return 'LiftFuel could not reach the sign-in check. Check your connection and try again.';
    case 'auth_not_configured':
      return 'Sign-in is unavailable right now. Please try again later.';
    case 'unknown':
    default:
      return 'Sign-in could not be completed. Please try again.';
  }
}

function classifyAuthSessionApiError(error: ApiError): AuthSessionFailureReason {
  if (error.status === 503 && error.code === 'AUTH_NOT_CONFIGURED') {
    return 'auth_not_configured';
  }

  if (error.status === 0 || error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_TIMEOUT') {
    return 'network_or_cors';
  }

  if (
    error.status === 401
    || [
      'INVALID_SESSION',
      'INVALID_SESSION_CLAIMS',
      'SESSION_EMAIL_MISSING',
      'UNAUTHENTICATED'
    ].includes(error.code)
  ) {
    return 'session_not_recognized';
  }

  return 'unknown';
}
