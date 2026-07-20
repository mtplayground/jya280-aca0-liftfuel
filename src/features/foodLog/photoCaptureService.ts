import * as ImagePicker from 'expo-image-picker';

import { apiClient } from '../../api/client';
import type { MealPhotoEstimateResponse, MealPhotoUploadResponse } from '../../api/types';

export type MealPhotoSource = 'camera' | 'library';

export type CapturedMealPhoto = {
  assetId: string | null;
  fileName: string;
  height: number;
  mimeType: string;
  uri: string;
  width: number;
};

const DEFAULT_IMAGE_TYPE = 'image/jpeg';

export async function captureMealPhoto(source: MealPhotoSource): Promise<CapturedMealPhoto | null> {
  const hasPermission = source === 'camera'
    ? await requestCameraPermission()
    : await requestLibraryPermission();

  if (!hasPermission) {
    throw new Error(
      source === 'camera'
        ? 'Camera access is required to capture a meal photo.'
        : 'Photo library access is required to choose a meal photo.'
    );
  }

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 0.85
      })
    : await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 0.85
      });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    assetId: asset.assetId ?? null,
    fileName: asset.fileName ?? fallbackFileName(asset.mimeType),
    height: asset.height,
    mimeType: asset.mimeType ?? DEFAULT_IMAGE_TYPE,
    uri: asset.uri,
    width: asset.width
  };
}

export async function uploadMealPhoto(
  foodEntryId: string,
  photo: CapturedMealPhoto
): Promise<MealPhotoUploadResponse> {
  return apiClient.post<MealPhotoUploadResponse>(
    `/food-entries/${encodeURIComponent(foodEntryId)}/photo`,
    buildPhotoFormData(photo),
    { timeoutMs: 30_000 }
  );
}

export async function estimateMealPhoto(
  photo: CapturedMealPhoto
): Promise<MealPhotoEstimateResponse> {
  return apiClient.post<MealPhotoEstimateResponse>(
    '/food-estimates/photo',
    buildPhotoFormData(photo),
    { timeoutMs: 45_000 }
  );
}

function buildPhotoFormData(photo: CapturedMealPhoto): FormData {
  const formData = new FormData();

  formData.append('photo', {
    name: photo.fileName,
    type: photo.mimeType,
    uri: photo.uri
  } as unknown as Blob);

  return formData;
}

async function requestCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestCameraPermissionsAsync();
  return requested.granted;
}

async function requestLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return requested.granted;
}

function fallbackFileName(mimeType?: string | null): string {
  switch (mimeType) {
    case 'image/png':
      return 'meal-photo.png';
    case 'image/webp':
      return 'meal-photo.webp';
    case 'image/heic':
      return 'meal-photo.heic';
    case 'image/heif':
      return 'meal-photo.heif';
    case 'image/jpeg':
    default:
      return 'meal-photo.jpg';
  }
}
