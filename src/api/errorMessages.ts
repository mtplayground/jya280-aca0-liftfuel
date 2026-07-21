import { ApiError } from './client';

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
      default:
        return error.message || fallback;
    }
  }

  if (error instanceof Error) return error.message;
  return fallback;
}
