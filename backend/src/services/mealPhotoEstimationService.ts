import type { AppConfig } from '../config';
import { HttpError } from '../errors';

export type MealPhotoEstimate = {
  caloriesKcal: number;
  carbsGrams: number;
  confidence: 'low' | 'medium' | 'high';
  correctionPrompts: string[];
  fatGrams: number;
  items: string[];
  name: string;
  proteinGrams: number;
  quantityDescription: string;
};

type EstimateMealPhotoInput = {
  body: Buffer;
  contentType: string;
};

type OpenAiResponse = {
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    type?: string;
  }>;
  output_text?: string;
};

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'name',
    'quantityDescription',
    'caloriesKcal',
    'proteinGrams',
    'carbsGrams',
    'fatGrams',
    'confidence',
    'items',
    'correctionPrompts'
  ],
  properties: {
    name: {
      type: 'string',
      description: 'Short user-facing name for the visible meal.'
    },
    quantityDescription: {
      type: 'string',
      description: 'Concise visible portion estimate, such as "1 bowl" or "about 350 g".'
    },
    caloriesKcal: {
      type: 'number',
      minimum: 0,
      maximum: 10000
    },
    proteinGrams: {
      type: 'number',
      minimum: 0,
      maximum: 1000
    },
    carbsGrams: {
      type: 'number',
      minimum: 0,
      maximum: 1000
    },
    fatGrams: {
      type: 'number',
      minimum: 0,
      maximum: 1000
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high']
    },
    items: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 8
    },
    correctionPrompts: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 5
    }
  }
} as const;

export class MealPhotoEstimationService {
  constructor(private readonly config: AppConfig) {}

  async estimate(input: EstimateMealPhotoInput): Promise<MealPhotoEstimate> {
    if (!this.config.openAiApiKey) {
      throw new HttpError(503, 'AI_ESTIMATION_NOT_CONFIGURED', 'AI estimation is not configured.');
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.openAiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.openAiModel,
        input: [
          {
            role: 'system',
            content:
              'Estimate visible meal calories and macronutrients. Be conservative, state uncertainty, and return correction prompts that help a user quickly fix the estimate.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text:
                  'Estimate this meal for a food log. Return values for the whole visible serving only. If the image is unclear or not food, use low confidence and a generic meal name.'
              },
              {
                type: 'input_image',
                image_url: `data:${input.contentType};base64,${input.body.toString('base64')}`
              }
            ]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'meal_photo_nutrition_estimate',
            strict: true,
            schema: responseSchema
          }
        }
      })
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error('AI estimation upstream request failed', {
        body: responseBody.slice(0, 500),
        status: response.status
      });
      throw new HttpError(
        502,
        'AI_ESTIMATION_FAILED',
        `AI estimation failed with status ${response.status}.`
      );
    }

    const responseBody = (await response.json()) as OpenAiResponse;
    const outputText = readOutputText(responseBody);
    if (!outputText) {
      throw new HttpError(502, 'AI_ESTIMATION_EMPTY', 'AI estimation returned no structured output.');
    }

    return normalizeEstimate(parseEstimate(outputText));
  }
}

function readOutputText(response: OpenAiResponse): string | null {
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }

  for (const output of response.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content.text === 'string') {
        return content.text;
      }
    }
  }

  return null;
}

function parseEstimate(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // handled below
  }

  throw new HttpError(502, 'AI_ESTIMATION_INVALID', 'AI estimation returned invalid JSON.');
}

function normalizeEstimate(value: Record<string, unknown>): MealPhotoEstimate {
  const confidence = readConfidence(value.confidence);

  return {
    caloriesKcal: readBoundedNumber(value.caloriesKcal, 0, 10000),
    carbsGrams: readBoundedNumber(value.carbsGrams, 0, 1000),
    confidence,
    correctionPrompts: readStringArray(value.correctionPrompts, [
      'Change the portion size',
      'Edit calories',
      'Edit protein, carbs, or fat'
    ]),
    fatGrams: readBoundedNumber(value.fatGrams, 0, 1000),
    items: readStringArray(value.items, []),
    name: readString(value.name, 'Estimated meal'),
    proteinGrams: readBoundedNumber(value.proteinGrams, 0, 1000),
    quantityDescription: readString(value.quantityDescription, 'Visible serving')
  };
}

function readBoundedNumber(value: unknown, minimum: number, maximum: number): number {
  const numeric = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(numeric)) return minimum;

  return Math.min(maximum, Math.max(minimum, Math.round(numeric * 10) / 10));
}

function readConfidence(value: unknown): MealPhotoEstimate['confidence'] {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'low';
}

function readString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 160) : fallback;
}

function readStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;

  const strings = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  return strings.length > 0 ? strings : fallback;
}
