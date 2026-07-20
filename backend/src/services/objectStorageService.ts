import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

import type { AppConfig } from '../config';
import { HttpError } from '../errors';

type ObjectStorageConfig = {
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  prefix: string;
  region: string;
  secretAccessKey: string;
};

type UploadMealPhotoInput = {
  accountId: string;
  body: Buffer;
  contentLength: number;
  contentType: string;
  foodEntryId: string;
};

export type UploadedObject = {
  bucket: string;
  byteSize: number;
  contentType: string;
  objectKey: string;
};

const supportedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]);

export class ObjectStorageService {
  private readonly client: S3Client;

  constructor(private readonly config: ObjectStorageConfig) {
    this.client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      endpoint: config.endpoint,
      forcePathStyle: true,
      region: config.region,
      requestChecksumCalculation: 'WHEN_REQUIRED'
    });
  }

  async uploadMealPhoto(input: UploadMealPhotoInput): Promise<UploadedObject> {
    if (!supportedImageTypes.has(input.contentType)) {
      throw new HttpError(400, 'UNSUPPORTED_IMAGE_TYPE', 'Use a JPEG, PNG, WebP, HEIC, or HEIF image.');
    }

    const objectKey = buildMealPhotoKey(
      this.config.prefix,
      input.accountId,
      input.foodEntryId,
      input.contentType
    );

    await this.client.send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: this.config.bucket,
        ContentLength: input.contentLength,
        ContentType: input.contentType,
        Key: objectKey
      })
    );

    return {
      bucket: this.config.bucket,
      byteSize: input.contentLength,
      contentType: input.contentType,
      objectKey
    };
  }
}

export function createObjectStorageService(config: AppConfig): ObjectStorageService {
  const storageConfig = readObjectStorageConfig(config);
  return new ObjectStorageService(storageConfig);
}

export function hasObjectStorageConfig(config: AppConfig): boolean {
  return Boolean(
    config.objectStorageAccessKeyId &&
      config.objectStorageBucket &&
      config.objectStorageEndpoint &&
      config.objectStoragePrefix &&
      config.objectStorageRegion &&
      config.objectStorageSecretAccessKey
  );
}

function readObjectStorageConfig(config: AppConfig): ObjectStorageConfig {
  if (!hasObjectStorageConfig(config)) {
    throw new HttpError(503, 'OBJECT_STORAGE_NOT_CONFIGURED', 'Object storage is not configured.');
  }

  return {
    accessKeyId: config.objectStorageAccessKeyId!,
    bucket: config.objectStorageBucket!,
    endpoint: config.objectStorageEndpoint!,
    prefix: config.objectStoragePrefix!,
    region: config.objectStorageRegion!,
    secretAccessKey: config.objectStorageSecretAccessKey!
  };
}

function buildMealPhotoKey(
  prefix: string,
  accountId: string,
  foodEntryId: string,
  contentType: string
): string {
  const extension = extensionForContentType(contentType);
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');

  return [
    normalizedPrefix,
    'accounts',
    accountId,
    'food-entries',
    foodEntryId,
    `${randomUUID()}${extension}`
  ].join('/');
}

function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/heic':
      return '.heic';
    case 'image/heif':
      return '.heif';
    case 'image/jpeg':
    default:
      return '.jpg';
  }
}
