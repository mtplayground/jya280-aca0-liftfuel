import type { DailyFoodTotals } from './foodLog';
import type { MacroTargets } from './plan';

export type CheckInStatusState = 'below_target' | 'on_track' | 'over_target';

export type DailyCheckInInput = {
  accountId: string;
  checkInDate: string;
  loggedFood: boolean;
  onTrack: boolean;
  onTrackState: CheckInStatusState;
  totals: DailyFoodTotals;
  target: MacroTargets;
  checkedInAt: Date;
};

export type DailyCheckIn = DailyCheckInInput & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type StreakSummary = {
  currentLoggingStreakDays: number;
  currentOnTrackStreakDays: number;
  longestLoggingStreakDays: number;
  longestOnTrackStreakDays: number;
  lastCheckInDate: string | null;
  recentCheckIns: DailyCheckIn[];
};
