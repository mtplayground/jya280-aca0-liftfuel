import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '../../../api/client';
import type { NutritionPlan, PlanTargetDay, TrainingDayResolution } from '../../../api/types';
import { AppText, Button, Card, Screen, StatRow } from '../../../components/ui';
import { colors, radius, spacing } from '../../../theme';
import { getNutritionPlan, getPlanDay } from '../planService';

type LoadState =
  | { status: 'loading' }
  | { message: string; status: 'error' }
  | {
      plan: NutritionPlan;
      today: TrainingDayResolution;
      status: 'ready';
    };

export function PlanScreen() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const loadPlan = async () => {
    setState({ status: 'loading' });

    try {
      const [plan, today] = await Promise.all([
        getNutritionPlan(),
        getPlanDay()
      ]);
      setState({ plan, status: 'ready', today });
    } catch (error) {
      setState({
        message: readErrorMessage(error, 'Unable to load plan targets.'),
        status: 'error'
      });
    }
  };

  useEffect(() => {
    let isActive = true;

    async function hydrate() {
      try {
        const [plan, today] = await Promise.all([
          getNutritionPlan(),
          getPlanDay()
        ]);
        if (isActive) {
          setState({ plan, status: 'ready', today });
        }
      } catch (error) {
        if (isActive) {
          setState({
            message: readErrorMessage(error, 'Unable to load plan targets.'),
            status: 'error'
          });
        }
      }
    }

    hydrate();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="caption" tone="primary" style={styles.eyebrow}>
            LiftFuel
          </AppText>
          <AppText variant="display">Plan</AppText>
        </View>

        {state.status === 'loading' ? (
          <Card style={styles.card}>
            <AppText variant="heading">Loading targets</AppText>
          </Card>
        ) : state.status === 'error' ? (
          <Card style={styles.card}>
            <AppText variant="heading">Plan unavailable</AppText>
            <AppText variant="body" tone="muted">
              {state.message}
            </AppText>
            <Button onPress={loadPlan}>Retry</Button>
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <AppText variant="heading">Today</AppText>
                <AppText
                  variant="caption"
                  tone={state.today.dayType === 'training' ? 'success' : 'muted'}
                  style={styles.dayType}
                >
                  {state.today.dayType === 'training' ? 'Training' : 'Rest'}
                </AppText>
              </View>
              <StatRow label="Date" value={`${state.today.weekdayName} ${state.today.date}`} />
              <StatRow
                label="Target"
                value={`${state.today.target.caloriesKcal} kcal`}
                helperText={state.today.splitFocus ?? 'Rest day'}
              />
            </Card>

            <View style={styles.targetGrid}>
              <TargetCard
                title="Training day"
                subtitle={`${state.plan.trainingDaysPerWeek} / week`}
                target={state.plan.trainingDay}
              />
              <TargetCard
                title="Rest day"
                subtitle={`${state.plan.restDaysPerWeek} / week`}
                target={state.plan.restDay}
              />
            </View>

            <Card style={styles.card}>
              <AppText variant="heading">Baseline</AppText>
              <StatRow label="BMR" value={`${state.plan.baseline.bmrKcal} kcal`} />
              <StatRow
                label="Maintenance"
                value={`${state.plan.baseline.maintenanceCaloriesKcal} kcal`}
              />
              <StatRow
                label="Goal average"
                value={`${state.plan.baseline.targetAverageCaloriesKcal} kcal`}
              />
              <StatRow label="Split" value={formatSplit(state.plan.trainingSplit)} />
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function TargetCard({
  subtitle,
  target,
  title
}: {
  subtitle: string;
  target: PlanTargetDay;
  title: string;
}) {
  return (
    <Card style={styles.targetCard}>
      <View style={styles.targetHeader}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" tone="muted">
          {subtitle}
        </AppText>
      </View>
      <View style={styles.calorieBlock}>
        <AppText variant="metric">{target.caloriesKcal}</AppText>
        <AppText variant="caption" tone="muted">
          kcal
        </AppText>
      </View>
      <MacroRow label="Protein" value={target.proteinGrams} color={colors.chartProtein} />
      <MacroRow label="Carbs" value={target.carbsGrams} color={colors.chartCarbs} />
      <MacroRow label="Fat" value={target.fatGrams} color={colors.chartFat} />
    </Card>
  );
}

function MacroRow({
  color,
  label,
  value
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.macroRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <AppText variant="caption" tone="muted" style={styles.macroLabel}>
        {label}
      </AppText>
      <AppText variant="metricSmall">{Math.round(value)}g</AppText>
    </View>
  );
}

function formatSplit(split: NutritionPlan['trainingSplit']): string {
  return split
    .split('_')
    .map((part) => part.replace(/^\w/, (character) => character.toUpperCase()))
    .join(' / ');
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: spacing.lg
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing['2xl']
  },
  header: {
    gap: spacing.sm,
    paddingTop: spacing.md
  },
  eyebrow: {
    textTransform: 'uppercase'
  },
  card: {
    gap: spacing.lg
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  dayType: {
    textTransform: 'uppercase'
  },
  targetGrid: {
    flexDirection: 'row',
    gap: spacing.md
  },
  targetCard: {
    flex: 1,
    gap: spacing.md
  },
  targetHeader: {
    gap: spacing.xs
  },
  calorieBlock: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md
  },
  macroRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingTop: spacing.md
  },
  macroLabel: {
    flex: 1,
    textTransform: 'uppercase'
  },
  swatch: {
    borderRadius: radius.sm,
    height: 10,
    width: 10
  }
});
