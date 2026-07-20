import { HttpError } from '../errors';
import { foodEntrySourceValues, mealTypeValues } from '../models';
import type { FoodEntryInput, FoodEntrySource, MealType } from '../models';

type FoodEntryBody = Record<string, unknown>;

export type ValidatedFoodEntryPayload = {
  input: FoodEntryInput;
  logDate: string;
};

export function validateFoodEntryPayload(value: unknown): ValidatedFoodEntryPayload {
  if (!isObject(value)) {
    throw new HttpError(400, 'FOOD_ENTRY_INVALID', 'Food entry payload is required.');
  }

  const fields: Record<string, string> = {};
  const body = value as FoodEntryBody;
  const logDate = readDate(body.logDate, 'logDate', fields);
  const name = readString(body.name, 'name', fields, 1, 160);
  const caloriesKcal = readNumber(body.caloriesKcal, 'caloriesKcal', fields, 0, 10000, 0);
  const proteinGrams = readNumber(body.proteinGrams, 'proteinGrams', fields, 0, 1000, 1);
  const carbsGrams = readNumber(body.carbsGrams, 'carbsGrams', fields, 0, 1000, 1);
  const fatGrams = readNumber(body.fatGrams, 'fatGrams', fields, 0, 1000, 1);
  const quantityValue = readNumber(body.quantityValue, 'quantityValue', fields, 0.001, 100000, 3);
  const quantityUnit = readString(body.quantityUnit, 'quantityUnit', fields, 1, 40);
  const mealType = readEnum<MealType>(body.mealType, 'mealType', fields, mealTypeValues);
  const consumedAt = readTimestamp(body.consumedAt, 'consumedAt', fields);
  const source = readEnum<FoodEntrySource>(
    body.source,
    'source',
    fields,
    foodEntrySourceValues
  );
  const notes = readOptionalString(body.notes, 'notes', fields, 1000);

  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'FOOD_ENTRY_VALIDATION_FAILED', 'Food entry fields are invalid.', fields);
  }

  return {
    input: {
      caloriesKcal,
      carbsGrams,
      consumedAt,
      fatGrams,
      mealType,
      name,
      notes,
      proteinGrams,
      quantityUnit,
      quantityValue,
      source
    },
    logDate
  };
}

export function readSearchQuery(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 2) {
    throw new HttpError(400, 'FOOD_SEARCH_QUERY_INVALID', 'Search with at least 2 characters.');
  }

  return value.trim().slice(0, 80);
}

function isObject(value: unknown): value is FoodEntryBody {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  value: unknown,
  field: string,
  fields: Record<string, string>,
  minimumLength: number,
  maximumLength: number
): string {
  if (typeof value !== 'string') {
    fields[field] = `Must be text between ${minimumLength} and ${maximumLength} characters.`;
    return '';
  }

  const trimmed = value.trim();
  if (trimmed.length < minimumLength || trimmed.length > maximumLength) {
    fields[field] = `Must be text between ${minimumLength} and ${maximumLength} characters.`;
    return trimmed;
  }

  return trimmed;
}

function readOptionalString(
  value: unknown,
  field: string,
  fields: Record<string, string>,
  maximumLength: number
): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string' || value.length > maximumLength) {
    fields[field] = `Must be ${maximumLength} characters or fewer.`;
    return null;
  }

  return value.trim() || null;
}

function readNumber(
  value: unknown,
  field: string,
  fields: Record<string, string>,
  minimum: number,
  maximum: number,
  precision: number
): number {
  const numberValue = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(numberValue) || numberValue < minimum || numberValue > maximum) {
    fields[field] = `Must be between ${minimum} and ${maximum}.`;
    return minimum;
  }

  return round(numberValue, precision);
}

function readDate(value: unknown, field: string, fields: Record<string, string>): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fields[field] = 'Must be a date in YYYY-MM-DD format.';
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fields[field] = 'Must be a valid calendar date.';
  }

  return value;
}

function readTimestamp(value: unknown, field: string, fields: Record<string, string>): Date {
  if (typeof value !== 'string') {
    fields[field] = 'Must be an ISO timestamp.';
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    fields[field] = 'Must be an ISO timestamp.';
    return new Date();
  }

  return parsed;
}

function readEnum<TValue extends string>(
  value: unknown,
  field: string,
  fields: Record<string, string>,
  allowedValues: readonly TValue[]
): TValue {
  if (typeof value !== 'string' || !allowedValues.includes(value as TValue)) {
    fields[field] = `Must be one of: ${allowedValues.join(', ')}.`;
    return allowedValues[0];
  }

  return value as TValue;
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
