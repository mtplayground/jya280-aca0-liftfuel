import type { NutritionPlan, TrainingDayResolution, TrainingSplit } from '../models';

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const trainingWeekdaysByFrequency: Record<number, number[]> = {
  0: [],
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6]
};

const splitFocuses: Record<TrainingSplit, string[]> = {
  body_part: ['Chest and shoulders', 'Back', 'Legs', 'Arms', 'Conditioning'],
  custom: ['Training'],
  full_body: ['Full body'],
  push_pull_legs: ['Push', 'Pull', 'Legs'],
  sport_specific: ['Practice', 'Strength', 'Conditioning'],
  upper_lower: ['Upper', 'Lower']
};

export function resolveTrainingDay(
  plan: NutritionPlan,
  dateString: string
): TrainingDayResolution {
  const date = parseIsoDate(dateString);
  const weekday = date.getUTCDay();
  const trainingDays = trainingWeekdaysByFrequency[plan.trainingDaysPerWeek] ?? [];
  const trainingDayIndex = trainingDays.indexOf(weekday);

  if (trainingDayIndex === -1) {
    return {
      date: dateString,
      dayType: 'rest',
      splitFocus: null,
      target: plan.restDay,
      trainingDayIndex: null,
      weekday
    };
  }

  const focuses = splitFocuses[plan.trainingSplit];

  return {
    date: dateString,
    dayType: 'training',
    splitFocus: focuses[trainingDayIndex % focuses.length],
    target: plan.trainingDay,
    trainingDayIndex,
    weekday
  };
}

export function formatWeekday(weekday: number): string {
  return weekdayNames[weekday] ?? 'Unknown';
}

function parseIsoDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}
