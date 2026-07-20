import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { ApiError } from '../../../api/client';
import type { DailyTotalsResponse, StreakSummary } from '../../../api/types';
import { AppText, Button, Card, Screen, StatRow } from '../../../components/ui';
import type { MainTabParamList } from '../../../navigation/types';
import { colors, radius, spacing } from '../../../theme';
import {
  createDailyCheckIn,
  getDailyTotals,
  getStreakSummary
} from '../../foodLog/foodLogService';
import { MacroProgressRow } from '../components/MacroProgressRow';

type LoadState =
  | { status: 'loading' }
  | { message: string; status: 'error' }
  | {
      status: 'ready';
      streaks: StreakSummary;
      totals: DailyTotalsResponse;
    };

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    setState({ status: 'loading' });
    setCheckInMessage(null);

    try {
      const [totals, streaks] = await Promise.all([
        getDailyTotals(),
        getStreakSummary()
      ]);
      setState({ status: 'ready', streaks, totals });
    } catch (error) {
      setState({
        message: readErrorMessage(error, 'Unable to load today.'),
        status: 'error'
      });
    }
  }, []);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const goToLog = () => {
    navigation.navigate('Log');
  };

  const saveCheckIn = async () => {
    if (state.status !== 'ready') return;

    setIsCheckingIn(true);
    setCheckInMessage(null);

    try {
      const response = await createDailyCheckIn({ date: state.totals.date });
      setState((current) => current.status === 'ready'
        ? { ...current, streaks: response.streaks }
        : current);
      setCheckInMessage('Check-in saved.');
    } catch (error) {
      setCheckInMessage(readErrorMessage(error, 'Unable to save check-in.'));
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" tone="primary" style={styles.eyebrow}>
              LiftFuel
            </AppText>
            <AppText variant="display">Today</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={goToLog}
            style={({ pressed }) => [styles.quickLogButton, pressed ? styles.pressed : undefined]}
          >
            <AppText variant="label" tone="inverse">
              Log meal
            </AppText>
          </Pressable>
        </View>

        {state.status === 'loading' ? (
          <Card style={styles.card}>
            <AppText variant="heading">Loading daily summary</AppText>
          </Card>
        ) : state.status === 'error' ? (
          <Card style={styles.card}>
            <AppText variant="heading">Home unavailable</AppText>
            <AppText variant="body" tone="muted">
              {state.message}
            </AppText>
            <Button onPress={loadHome}>Retry</Button>
          </Card>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <SummaryTile
                label="Calories"
                tone={state.totals.remaining.caloriesKcal >= 0 ? 'default' : 'warning'}
                value={`${Math.round(state.totals.totals.caloriesKcal)} / ${Math.round(state.totals.target.caloriesKcal)}`}
              />
              <SummaryTile
                label="Day type"
                value={state.totals.dayType === 'training' ? 'Training' : 'Rest'}
                helper={state.totals.splitFocus ?? 'Recovery'}
              />
              <SummaryTile
                label="Logging streak"
                value={`${state.streaks.currentLoggingStreakDays}`}
                helper="days"
              />
            </View>

            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <View>
                  <AppText variant="heading">Targets</AppText>
                  <AppText variant="caption" tone="muted">
                    {state.totals.weekdayName} {state.totals.date}
                  </AppText>
                </View>
                <StatusPill state={state.totals.status.state} label={state.totals.status.label} />
              </View>

              <MacroProgressRow
                color={colors.chartCalories}
                label="Calories"
                remaining={state.totals.remaining.caloriesKcal}
                target={state.totals.target.caloriesKcal}
                total={state.totals.totals.caloriesKcal}
                unit="kcal"
              />
              <MacroProgressRow
                color={colors.chartProtein}
                label="Protein"
                remaining={state.totals.remaining.proteinGrams}
                target={state.totals.target.proteinGrams}
                total={state.totals.totals.proteinGrams}
                unit="g"
              />
              <MacroProgressRow
                color={colors.chartCarbs}
                label="Carbs"
                remaining={state.totals.remaining.carbsGrams}
                target={state.totals.target.carbsGrams}
                total={state.totals.totals.carbsGrams}
                unit="g"
              />
              <MacroProgressRow
                color={colors.chartFat}
                label="Fat"
                remaining={state.totals.remaining.fatGrams}
                target={state.totals.target.fatGrams}
                total={state.totals.totals.fatGrams}
                unit="g"
              />
            </Card>

            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <AppText variant="heading">Consistency</AppText>
                <Button disabled={isCheckingIn} onPress={saveCheckIn} variant="secondary">
                  {isCheckingIn ? 'Saving...' : 'Check in'}
                </Button>
              </View>
              <StatRow
                label="On-track streak"
                value={`${state.streaks.currentOnTrackStreakDays} days`}
              />
              <StatRow
                label="Best logging streak"
                value={`${state.streaks.longestLoggingStreakDays} days`}
              />
              <StatRow
                label="Last check-in"
                value={state.streaks.lastCheckInDate ?? 'None yet'}
              />
              {checkInMessage ? (
                <AppText
                  variant="caption"
                  tone={checkInMessage.includes('Unable') ? 'danger' : 'success'}
                >
                  {checkInMessage}
                </AppText>
              ) : null}
            </Card>

            <Button onPress={goToLog}>Quick log meal</Button>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function SummaryTile({
  helper,
  label,
  tone = 'default',
  value
}: {
  helper?: string;
  label: string;
  tone?: 'default' | 'warning';
  value: string;
}) {
  return (
    <Card style={styles.summaryTile}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="metricSmall" tone={tone}>
        {value}
      </AppText>
      {helper ? (
        <AppText variant="caption" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </Card>
  );
}

function StatusPill({
  label,
  state
}: {
  label: string;
  state: DailyTotalsResponse['status']['state'];
}) {
  const tone = state === 'on_track' ? 'success' : state === 'over_target' ? 'warning' : 'muted';

  return (
    <View style={[styles.statusPill, state === 'on_track' ? styles.statusPillOnTrack : undefined]}>
      <AppText variant="caption" tone={tone} style={styles.statusPillText}>
        {label}
      </AppText>
    </View>
  );
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing['2xl']
  },
  eyebrow: {
    textTransform: 'uppercase'
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
    paddingTop: spacing.md
  },
  pressed: {
    opacity: 0.82
  },
  quickLogButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  screen: {
    paddingHorizontal: spacing.lg
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  statusPill: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  statusPillOnTrack: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success
  },
  statusPillText: {
    textTransform: 'uppercase'
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.md
  },
  summaryTile: {
    flex: 1,
    gap: spacing.xs,
    minHeight: 112
  }
});
