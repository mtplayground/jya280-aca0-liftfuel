import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import jwt from 'jsonwebtoken';
import type { Pool } from 'pg';

import { createApp } from '../app';
import type { AppConfig } from '../config';

type QueryResult<TRow> = { rows: TRow[] };
type JsonRecord = Record<string, unknown>;

function rows<TRow>(items: unknown[]): QueryResult<TRow> {
  return { rows: items as TRow[] };
}

function expectString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError('Expected string value');
  }
  return value;
}

function expectNumber(value: unknown): number {
  if (typeof value !== 'number') {
    throw new TypeError('Expected number value');
  }
  return value;
}

function dateOnly(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return expectString(value);
}

function numeric(value: number): string {
  return value.toFixed(2);
}

class TestDatabase {
  private accounts = new Map<string, JsonRecord>();
  private profiles = new Map<string, JsonRecord>();
  private foodDays = new Map<string, JsonRecord>();
  private foodEntries: JsonRecord[] = [];
  private checkIns = new Map<string, JsonRecord>();
  private progressEntries = new Map<string, JsonRecord>();

  private readonly foodItems: JsonRecord[] = [
    {
      id: randomUUID(),
      name: 'Chicken breast, cooked',
      brand: null,
      serving_name: '100 g',
      serving_grams: numeric(100),
      calories_kcal: 165,
      protein_g: numeric(31),
      carbs_g: numeric(0),
      fat_g: numeric(3.6),
      search_text: 'chicken breast cooked',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  async query<TRow>(sql: string, values: readonly unknown[] = []): Promise<QueryResult<TRow>> {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (normalized.includes('INSERT INTO user_accounts')) {
      const subject = expectString(values[0]);
      const existing = this.accounts.get(subject);
      const now = new Date();
      const account = {
        id: existing?.id ?? randomUUID(),
        auth_subject: subject,
        email: expectString(values[1]),
        email_verified: Boolean(values[2]),
        display_name: values[3] ?? null,
        picture_url: values[4] ?? null,
        created_at: existing?.created_at ?? now,
        updated_at: now,
        last_seen_at: now,
        is_new_account: existing ? false : true,
      };
      this.accounts.set(subject, account);
      return rows<TRow>([account]);
    }

    if (normalized.includes('INSERT INTO user_sessions')) {
      const now = new Date();
      return rows<TRow>([
        {
          id: randomUUID(),
          account_id: values[0],
          session_key_hash: values[1],
          identity_provider: 'mctai',
          issued_at: values[2],
          expires_at: values[3],
          revoked_at: null,
          created_at: now,
          updated_at: now,
          last_seen_at: now,
        },
      ]);
    }

    if (normalized.includes('SELECT * FROM user_profiles WHERE account_id = $1')) {
      return rows<TRow>([this.profiles.get(expectString(values[0]))].filter(Boolean));
    }

    if (normalized.includes('INSERT INTO user_profiles')) {
      const accountId = expectString(values[0]);
      const now = new Date();
      const existing = this.profiles.get(accountId);
      const profile = {
        id: existing?.id ?? randomUUID(),
        account_id: accountId,
        weight_kg: numeric(expectNumber(values[1])),
        height_cm: numeric(expectNumber(values[2])),
        age_years: values[3],
        sex: values[4],
        activity_level: values[5],
        goal: values[6],
        body_fat_percent: values[7] === null ? null : numeric(expectNumber(values[7])),
        body_fat_is_estimate: values[8],
        training_split: values[9],
        training_days_per_week: values[10],
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      this.profiles.set(accountId, profile);
      return rows<TRow>([profile]);
    }

    if (normalized.includes('FROM food_items')) {
      const term = expectString(values[0]).replaceAll('%', '').toLowerCase();
      return rows<TRow>(
        this.foodItems
          .filter((item) => expectString(item.search_text).includes(term))
          .slice(0, Number(values[1] ?? 10)),
      );
    }

    if (normalized.includes('WITH inserted AS ( INSERT INTO food_log_days')) {
      const accountId = expectString(values[0]);
      const logDate = dateOnly(values[1]);
      const key = `${accountId}:${logDate}`;
      const existing = this.foodDays.get(key);
      if (existing) {
        return rows<TRow>([existing]);
      }

      const day = {
        id: randomUUID(),
        account_id: accountId,
        log_date: new Date(`${logDate}T00:00:00.000Z`),
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.foodDays.set(key, day);
      return rows<TRow>([day]);
    }

    if (normalized.includes('INSERT INTO food_entries')) {
      const entry = {
        id: randomUUID(),
        account_id: values[0],
        food_log_day_id: values[1],
        name: values[2],
        calories_kcal: values[3],
        protein_g: numeric(expectNumber(values[4])),
        carbs_g: numeric(expectNumber(values[5])),
        fat_g: numeric(expectNumber(values[6])),
        quantity_value: numeric(expectNumber(values[7])),
        quantity_unit: values[8],
        meal_type: values[9],
        consumed_at: values[10],
        source: values[11],
        notes: values[12],
        photo_object_key: null,
        photo_content_type: null,
        photo_byte_size: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.foodEntries.push(entry);
      return rows<TRow>([entry]);
    }

    if (normalized.includes('COUNT(fe.id) AS entry_count')) {
      const accountId = expectString(values[0]);
      const logDate = dateOnly(values[1]);
      const day = this.foodDays.get(`${accountId}:${logDate}`);
      const entries = day
        ? this.foodEntries.filter((entry) => entry.food_log_day_id === day.id)
        : [];
      const sum = (field: string) =>
        entries.reduce((total, entry) => total + Number(entry[field] ?? 0), 0);
      return rows<TRow>([
        {
          entry_count: String(entries.length),
          calories_kcal: String(Math.round(sum('calories_kcal'))),
          protein_g: numeric(sum('protein_g')),
          carbs_g: numeric(sum('carbs_g')),
          fat_g: numeric(sum('fat_g')),
        },
      ]);
    }

    if (normalized.includes('INSERT INTO daily_check_ins')) {
      const accountId = expectString(values[0]);
      const checkInDate = dateOnly(values[1]);
      const key = `${accountId}:${checkInDate}`;
      const existing = this.checkIns.get(key);
      const checkIn = {
        id: existing?.id ?? randomUUID(),
        account_id: accountId,
        check_in_date: new Date(`${checkInDate}T00:00:00.000Z`),
        logged_food: values[2],
        on_track: values[3],
        on_track_state: values[4],
        calories_kcal: values[5],
        protein_g: numeric(expectNumber(values[6])),
        carbs_g: numeric(expectNumber(values[7])),
        fat_g: numeric(expectNumber(values[8])),
        target_calories_kcal: values[9],
        target_protein_g: numeric(expectNumber(values[10])),
        target_carbs_g: numeric(expectNumber(values[11])),
        target_fat_g: numeric(expectNumber(values[12])),
        checked_in_at: values[13],
        created_at: existing?.created_at ?? new Date(),
        updated_at: new Date(),
      };
      this.checkIns.set(key, checkIn);
      return rows<TRow>([checkIn]);
    }

    if (normalized.includes('SELECT * FROM daily_check_ins')) {
      const accountId = expectString(values[0]);
      const throughDate = dateOnly(values[1]);
      const limit = values[2] === undefined ? undefined : Number(values[2]);
      const checkIns = [...this.checkIns.values()]
        .filter(
          (checkIn) =>
            checkIn.account_id === accountId && dateOnly(checkIn.check_in_date) <= throughDate,
        )
        .sort((a, b) => dateOnly(b.check_in_date).localeCompare(dateOnly(a.check_in_date)));
      return rows<TRow>(limit ? checkIns.slice(0, limit) : checkIns);
    }

    if (normalized.includes('INSERT INTO progress_entries')) {
      const accountId = expectString(values[0]);
      const entryDate = dateOnly(values[1]);
      const key = `${accountId}:${entryDate}`;
      const existing = this.progressEntries.get(key);
      const entry = {
        id: existing?.id ?? randomUUID(),
        account_id: accountId,
        entry_date: new Date(`${entryDate}T00:00:00.000Z`),
        weight_kg: values[2] === null ? null : numeric(expectNumber(values[2])),
        body_fat_percent: values[3] === null ? null : numeric(expectNumber(values[3])),
        body_fat_is_estimate: values[4],
        performance_metrics: values[5] ?? [],
        notes: values[6] ?? null,
        created_at: existing?.created_at ?? new Date(),
        updated_at: new Date(),
      };
      this.progressEntries.set(key, entry);
      return rows<TRow>([entry]);
    }

    if (normalized.includes('FROM progress_entries')) {
      const accountId = expectString(values[0]);
      const fromDate = dateOnly(values[1]);
      const toDate = dateOnly(values[2]);
      const limit = Number(values[3] ?? 100);
      return rows<TRow>(
        [...this.progressEntries.values()]
          .filter((entry) => {
            const entryDate = dateOnly(entry.entry_date);
            return entry.account_id === accountId && entryDate >= fromDate && entryDate <= toDate;
          })
          .sort((a, b) => dateOnly(b.entry_date).localeCompare(dateOnly(a.entry_date)))
          .slice(0, limit),
      );
    }

    throw new Error(`Unhandled test query: ${normalized}`);
  }
}

function listen(server: http.Server): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise<void>((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()));
          }),
      });
    });
  });
}

async function requestJson(
  baseUrl: string,
  token: string,
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<{ status: number; body: unknown }> {
  const headers = new Headers(init.headers);
  headers.set('Cookie', `mctai_session=${token}`);
  let body = init.body;

  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.json);
  }

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, body });
  const text = await response.text();
  return {
    status: response.status,
    body: text.length > 0 ? JSON.parse(text) : null,
  };
}

test('complete signed-in nutrition journey supports release flow', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = {
    ...(publicKey.export({ format: 'jwk' }) as JsonWebKey),
    kid: 'test-key',
    use: 'sig',
    alg: 'RS256',
  };

  const jwksServer = http.createServer((request, response) => {
    if (request.url === '/.well-known/jwks.json') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    response.writeHead(404);
    response.end();
  });
  const jwks = await listen(jwksServer);

  const authUrl = jwks.baseUrl;
  const authAppToken = 'app_jya280-aca0-liftfuel-6e5db6';
  const config: AppConfig = {
    apiBasePath: '/api',
    databaseMaxConnections: 1,
    nodeEnv: 'test',
    host: '127.0.0.1',
    isProduction: false,
    port: 0,
    databaseUrl: 'postgres://liftfuel-test.local/liftfuel',
    authUrl,
    authAppToken,
    authJwksUrl: `${jwks.baseUrl}/.well-known/jwks.json`,
    selfUrl: 'http://127.0.0.1',
    openAiApiKey: 'test-openai-key',
    openAiModel: 'gpt-4o-mini',
    objectStorageEndpoint: undefined,
    objectStorageRegion: 'auto',
    objectStorageBucket: undefined,
    objectStorageAccessKeyId: undefined,
    objectStorageSecretAccessKey: undefined,
    objectStoragePrefix: 'test',
  };

  const apiServer = http.createServer(createApp(config, new TestDatabase() as unknown as Pool));
  const api = await listen(apiServer);

  const token = jwt.sign(
    {
      sub: 'user-full-flow',
      email: 'fullflow@example.com',
      email_verified: true,
      name: 'Full Flow',
      picture: 'https://example.com/full-flow.png',
    },
    privateKey.export({ format: 'pem', type: 'pkcs8' }),
    {
      algorithm: 'RS256',
      keyid: 'test-key',
      audience: authAppToken,
      issuer: authUrl,
      expiresIn: '1h',
    },
  );

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url === 'https://api.openai.com/v1/responses') {
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            name: 'Chicken rice bowl',
            quantityDescription: '1 bowl',
            caloriesKcal: 640,
            proteinGrams: 46,
            carbsGrams: 68,
            fatGrams: 18,
            confidence: 'medium',
            detectedItems: ['chicken', 'rice', 'vegetables'],
            correctionPrompts: ['Adjust rice portion', 'Confirm sauce amount'],
          }),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return originalFetch(input, init);
  };

  try {
    const signedIn = await requestJson(api.baseUrl, token, '/api/auth/me');
    assert.equal(signedIn.status, 200);
    assert.equal((signedIn.body as JsonRecord).isNewAccount, true);

    const onboarded = await requestJson(api.baseUrl, token, '/api/profile', {
      method: 'PUT',
      json: {
        sex: 'female',
        ageYears: 34,
        heightCm: 168,
        weightKg: 68,
        activityLevel: 'moderate',
        trainingDaysPerWeek: 4,
        trainingSplit: 'upper_lower',
        goal: 'bulk',
        bodyFatPercent: 24.4,
      },
    });
    assert.equal(onboarded.status, 200);
    assert.equal(((onboarded.body as JsonRecord).profile as JsonRecord).goal, 'bulk');

    const plan = await requestJson(api.baseUrl, token, '/api/plan');
    assert.equal(plan.status, 200);
    const planBody = (plan.body as JsonRecord).plan as JsonRecord;
    assert.ok((planBody.trainingDay as JsonRecord).caloriesKcal);
    assert.ok((planBody.restDay as JsonRecord).caloriesKcal);

    const dayPlan = await requestJson(api.baseUrl, token, '/api/plan/day?date=2026-07-20');
    assert.equal(dayPlan.status, 200);
    assert.equal(((dayPlan.body as JsonRecord).day as JsonRecord).dayType, 'training');

    const photoForm = new FormData();
    photoForm.append(
      'photo',
      new Blob([Buffer.from('fake meal photo')], { type: 'image/png' }),
      'meal.png',
    );
    const photoEstimateResponse = await fetch(`${api.baseUrl}/api/food-estimates/photo`, {
      method: 'POST',
      headers: { Cookie: `mctai_session=${token}` },
      body: photoForm,
    });
    assert.equal(photoEstimateResponse.status, 200);
    const photoEstimate = (await photoEstimateResponse.json()) as JsonRecord;
    const estimate = photoEstimate.estimate as JsonRecord;
    assert.equal(estimate.name, 'Chicken rice bowl');
    assert.equal(estimate.caloriesKcal, 640);

    const photoEntry = await requestJson(api.baseUrl, token, '/api/food-entries', {
      method: 'POST',
      json: {
        logDate: '2026-07-20',
        name: estimate.name,
        caloriesKcal: estimate.caloriesKcal,
        proteinGrams: estimate.proteinGrams,
        carbsGrams: estimate.carbsGrams,
        fatGrams: estimate.fatGrams,
        quantityValue: 1,
        quantityUnit: 'bowl',
        mealType: 'lunch',
        consumedAt: '2026-07-20T12:30:00.000Z',
        source: 'photo_estimate',
      },
    });
    assert.equal(photoEntry.status, 201);

    const foodSearch = await requestJson(api.baseUrl, token, '/api/foods/search?q=chicken');
    assert.equal(foodSearch.status, 200);
    assert.equal(((foodSearch.body as JsonRecord).items as unknown[]).length, 1);

    const manualEntry = await requestJson(api.baseUrl, token, '/api/food-entries', {
      method: 'POST',
      json: {
        logDate: '2026-07-20',
        name: 'Chicken breast, cooked',
        caloriesKcal: 220,
        proteinGrams: 42,
        carbsGrams: 0,
        fatGrams: 5,
        quantityValue: 135,
        quantityUnit: 'g',
        mealType: 'dinner',
        consumedAt: '2026-07-20T18:45:00.000Z',
        source: 'manual',
      },
    });
    assert.equal(manualEntry.status, 201);

    const dailyTotals = await requestJson(api.baseUrl, token, '/api/daily-totals?date=2026-07-20');
    assert.equal(dailyTotals.status, 200);
    assert.equal(((dailyTotals.body as JsonRecord).totals as JsonRecord).caloriesKcal, 860);
    assert.equal((dailyTotals.body as JsonRecord).entryCount, 2);
    assert.ok(((dailyTotals.body as JsonRecord).remaining as JsonRecord).proteinGrams);

    const checkIn = await requestJson(api.baseUrl, token, '/api/check-ins/daily', {
      method: 'POST',
      json: { date: '2026-07-20' },
    });
    assert.equal(checkIn.status, 201);
    assert.equal(((checkIn.body as JsonRecord).checkIn as JsonRecord).loggedFood, true);
    assert.equal(((checkIn.body as JsonRecord).streaks as JsonRecord).currentLoggingStreakDays, 1);

    const progress = await requestJson(api.baseUrl, token, '/api/progress', {
      method: 'POST',
      json: {
        entryDate: '2026-07-20',
        weightKg: 68.2,
        bodyFatPercent: 24.4,
        bodyFatIsEstimate: false,
        performanceMetrics: [
          { name: 'Squat', value: 82.5, unit: 'kg', notes: 'Top set moved well' },
        ],
        notes: 'First full journey check',
      },
    });
    assert.equal(progress.status, 201);
    assert.equal(((progress.body as JsonRecord).entry as JsonRecord).weightKg, 68.2);

    const progressList = await requestJson(
      api.baseUrl,
      token,
      '/api/progress?from=2026-07-01&to=2026-07-31',
    );
    assert.equal(progressList.status, 200);
    assert.equal(((progressList.body as JsonRecord).entries as unknown[]).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await api.close();
    await jwks.close();
  }
});
