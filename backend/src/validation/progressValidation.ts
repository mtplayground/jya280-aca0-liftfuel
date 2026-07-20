import { HttpError } from '../errors';
import type { PerformanceMetric, ProgressEntryInput, ProgressEntryQuery } from '../models';

type ProgressBody = Record<string, unknown>;

export function validateProgressEntryInput(value: unknown): ProgressEntryInput {
  if (!isObject(value)) {
    throw new HttpError(400, 'PROGRESS_INVALID', 'Progress payload is required.');
  }

  const fields: Record<string, string> = {};
  const body = value as ProgressBody;
  const entryDate = readDate(body.entryDate, 'entryDate', fields);
  const weightKg = readOptionalNumber(body.weightKg, 'weightKg', fields, 20, 400, 2);
  const bodyFatPercent = readOptionalNumber(
    body.bodyFatPercent,
    'bodyFatPercent',
    fields,
    3,
    75,
    1
  );
  const bodyFatIsEstimate = bodyFatPercent === null
    ? false
    : readOptionalBoolean(body.bodyFatIsEstimate, true, 'bodyFatIsEstimate', fields);
  const performanceMetrics = readPerformanceMetrics(body.performanceMetrics, fields);
  const notes = readOptionalString(body.notes, 'notes', fields, 1000);

  if (weightKg === null && bodyFatPercent === null && performanceMetrics.length === 0) {
    fields.entry = 'Record weight, body fat, or at least one performance metric.';
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'PROGRESS_VALIDATION_FAILED', 'Progress fields are invalid.', fields);
  }

  return {
    bodyFatIsEstimate,
    bodyFatPercent,
    entryDate,
    notes,
    performanceMetrics,
    weightKg
  };
}

export function validateProgressQuery(query: Record<string, unknown>): ProgressEntryQuery {
  const fields: Record<string, string> = {};
  const fromDate = query.from === undefined ? undefined : readDate(query.from, 'from', fields);
  const toDate = query.to === undefined ? undefined : readDate(query.to, 'to', fields);
  const limit = readOptionalInteger(query.limit, 'limit', fields, 30, 1, 180);

  if (fromDate && toDate && fromDate > toDate) {
    fields.from = 'from must be on or before to.';
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'PROGRESS_QUERY_INVALID', 'Progress query is invalid.', fields);
  }

  return { fromDate, limit, toDate };
}

function isObject(value: unknown): value is ProgressBody {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPerformanceMetrics(
  value: unknown,
  fields: Record<string, string>
): PerformanceMetric[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.length > 12) {
    fields.performanceMetrics = 'Must be an array with 12 metrics or fewer.';
    return [];
  }

  return value.map((metric, index) => {
    const prefix = `performanceMetrics.${index}`;
    if (!isObject(metric)) {
      fields[prefix] = 'Metric must be an object.';
      return { name: '', notes: null, unit: '', value: 0 };
    }

    return {
      name: readString(metric.name, `${prefix}.name`, fields, 1, 80),
      notes: readOptionalString(metric.notes, `${prefix}.notes`, fields, 240),
      unit: readString(metric.unit, `${prefix}.unit`, fields, 1, 32),
      value: readNumber(metric.value, `${prefix}.value`, fields, 0, 1000000, 2)
    };
  });
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

function readOptionalNumber(
  value: unknown,
  field: string,
  fields: Record<string, string>,
  minimum: number,
  maximum: number,
  precision: number
): number | null {
  if (value === undefined || value === null || value === '') return null;
  return readNumber(value, field, fields, minimum, maximum, precision);
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

function readOptionalBoolean(
  value: unknown,
  fallback: boolean,
  field: string,
  fields: Record<string, string>
): boolean {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== 'boolean') {
    fields[field] = 'Must be true or false.';
    return fallback;
  }

  return value;
}

function readOptionalInteger(
  value: unknown,
  field: string,
  fields: Record<string, string>,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    fields[field] = `Must be a whole number between ${minimum} and ${maximum}.`;
    return fallback;
  }

  return parsed;
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
