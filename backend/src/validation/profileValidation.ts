import { HttpError } from '../errors';
import {
  activityLevelValues,
  goalValues,
  sexValues,
  trainingSplitValues
} from '../models';
import type { ActivityLevel, Goal, ProfileInput, Sex, TrainingSplit } from '../models';

type ProfileBody = Record<string, unknown>;

export function validateProfileInput(value: unknown): ProfileInput {
  if (!isObject(value)) {
    throw new HttpError(400, 'PROFILE_INVALID', 'Profile payload is required.');
  }

  const fields: Record<string, string> = {};
  const body = value as ProfileBody;

  const weightKg = readNumber(body.weightKg, 'weightKg', fields, 20, 400);
  const heightCm = readNumber(body.heightCm, 'heightCm', fields, 90, 250);
  const ageYears = readInteger(body.ageYears, 'ageYears', fields, 13, 100);
  const sex = readEnum<Sex>(body.sex, 'sex', fields, sexValues);
  const activityLevel = readEnum<ActivityLevel>(
    body.activityLevel,
    'activityLevel',
    fields,
    activityLevelValues
  );
  const goal = readEnum<Goal>(body.goal, 'goal', fields, goalValues);
  const bodyFatPercent = readOptionalNumber(
    body.bodyFatPercent,
    'bodyFatPercent',
    fields,
    3,
    75
  );
  const trainingSplit = readEnum<TrainingSplit>(
    body.trainingSplit,
    'trainingSplit',
    fields,
    trainingSplitValues
  );
  const trainingDaysPerWeek = readInteger(
    body.trainingDaysPerWeek,
    'trainingDaysPerWeek',
    fields,
    0,
    7
  );

  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'PROFILE_VALIDATION_FAILED', 'Profile fields are invalid.', fields);
  }

  return {
    activityLevel,
    ageYears,
    bodyFatIsEstimate: true,
    bodyFatPercent,
    goal,
    heightCm,
    sex,
    trainingDaysPerWeek,
    trainingSplit,
    weightKg
  };
}

function isObject(value: unknown): value is ProfileBody {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(
  value: unknown,
  field: string,
  fields: Record<string, string>,
  minimum: number,
  maximum: number
): number {
  const numberValue = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(numberValue) || numberValue < minimum || numberValue > maximum) {
    fields[field] = `Must be between ${minimum} and ${maximum}.`;
    return minimum;
  }

  return round(numberValue, 2);
}

function readOptionalNumber(
  value: unknown,
  field: string,
  fields: Record<string, string>,
  minimum: number,
  maximum: number
): number | null {
  if (value === undefined || value === null || value === '') return null;
  return round(readNumber(value, field, fields, minimum, maximum), 1);
}

function readInteger(
  value: unknown,
  field: string,
  fields: Record<string, string>,
  minimum: number,
  maximum: number
): number {
  const numberValue = readNumber(value, field, fields, minimum, maximum);
  if (!Number.isInteger(numberValue)) {
    fields[field] = `Must be a whole number between ${minimum} and ${maximum}.`;
    return minimum;
  }

  return numberValue;
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
