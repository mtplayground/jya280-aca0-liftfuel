import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { readAppErrorMessage } from '../../../api/errorMessages';
import type { Goal, PerformanceMetric, ProgressEntry, UserProfile } from '../../../api/types';
import { AppText, Button, Card, Screen, StatRow } from '../../../components/ui';
import { colors, radius, spacing } from '../../../theme';
import { getProfile } from '../../profile';
import { listProgressEntries } from '../../progress';
import { TrendChart } from '../components/TrendChart';
import type { TrendPoint } from '../components/TrendChart';

type RangeOption = {
  days: number;
  label: string;
};

type PerformanceSeries = {
  name: string;
  points: TrendPoint[];
  unit: string;
};

type LoadState =
  | { status: 'loading' }
  | { message: string; status: 'error' }
  | {
      entries: ProgressEntry[];
      profile: UserProfile | null;
      status: 'ready';
    };

const rangeOptions: RangeOption[] = [
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
  { days: 180, label: '180D' }
];

export function TrendsScreen() {
  const [rangeDays, setRangeDays] = useState(90);
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const loadTrends = useCallback(async () => {
    setState({ status: 'loading' });

    try {
      const [entries, profile] = await Promise.all([
        listProgressEntries({
          from: dateDaysAgo(rangeDays),
          limit: rangeDays,
          to: todayDate()
        }),
        getProfile()
      ]);

      setState({
        entries: entries.slice().sort(compareByDate),
        profile,
        status: 'ready'
      });
    } catch (error) {
      setState({
        message: readErrorMessage(error, 'Unable to load trends.'),
        status: 'error'
      });
    }
  }, [rangeDays]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  const trendData = useMemo(() => {
    if (state.status !== 'ready') return null;

    const weightPoints = toMetricPoints(state.entries, 'weightKg');
    const bodyFatPoints = toMetricPoints(state.entries, 'bodyFatPercent');
    const performanceSeries = pickPerformanceSeries(state.entries);

    return {
      bodyFatDelta: calculateDelta(bodyFatPoints),
      bodyFatPoints,
      performanceSeries,
      weightDelta: calculateDelta(weightPoints),
      weightPoints
    };
  }, [state]);

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" tone="primary" style={styles.eyebrow}>
              LiftFuel
            </AppText>
            <AppText variant="display">Trends</AppText>
          </View>
          <RangeSelector selectedDays={rangeDays} onSelect={setRangeDays} />
        </View>

        {state.status === 'loading' ? (
          <Card style={styles.card}>
            <AppText variant="heading">Loading trends</AppText>
          </Card>
        ) : state.status === 'error' ? (
          <Card style={styles.card}>
            <AppText variant="heading">Trends unavailable</AppText>
            <AppText variant="body" tone="muted">
              {state.message}
            </AppText>
            <Button onPress={loadTrends}>Retry</Button>
          </Card>
        ) : trendData ? (
          <>
            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitle}>
                  <AppText variant="heading">{goalTitle(state.profile?.goal)}</AppText>
                  <AppText variant="caption" tone="muted">
                    {goalOrientation(state.profile?.goal)}
                  </AppText>
                </View>
                <View style={styles.entryPill}>
                  <AppText variant="caption" tone="primary">
                    {state.entries.length} entries
                  </AppText>
                </View>
              </View>
              <StatRow
                label="Weight change"
                value={formatDelta(trendData.weightDelta, 'kg')}
                helperText={`${rangeDays} day range`}
              />
              <StatRow
                label="Body fat change"
                value={formatDelta(trendData.bodyFatDelta, '%')}
                helperText="Recorded check-ins"
              />
              <StatRow
                label="Performance"
                value={trendData.performanceSeries?.name ?? 'No metric'}
                helperText={trendData.performanceSeries ? trendData.performanceSeries.unit : 'Add a metric from Progress'}
              />
            </Card>

            {state.entries.length === 0 ? (
              <Card style={styles.card}>
                <AppText variant="heading">No progress entries yet</AppText>
                <AppText variant="body" tone="muted">
                  Record weight, body fat, or performance metrics to start charting trends.
                </AppText>
              </Card>
            ) : null}

            <TrendChart
              color={colors.chartCalories}
              emptyLabel="No weight entries yet"
              points={trendData.weightPoints}
              title="Weight"
              unit="kg"
            />
            <TrendChart
              color={colors.chartFat}
              emptyLabel="No body fat entries yet"
              points={trendData.bodyFatPoints}
              title="Body fat"
              unit="%"
            />
            <TrendChart
              color={colors.chartProtein}
              emptyLabel="No performance metrics yet"
              points={trendData.performanceSeries?.points ?? []}
              title={trendData.performanceSeries?.name ?? 'Performance'}
              unit={trendData.performanceSeries?.unit ?? ''}
            />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function RangeSelector({
  onSelect,
  selectedDays
}: {
  onSelect: (days: number) => void;
  selectedDays: number;
}) {
  return (
    <View style={styles.rangeGroup}>
      {rangeOptions.map((option) => {
        const isSelected = option.days === selectedDays;

        return (
          <Pressable
            accessibilityRole="button"
            key={option.days}
            onPress={() => onSelect(option.days)}
            style={({ pressed }) => [
              styles.rangeButton,
              isSelected ? styles.rangeButtonSelected : undefined,
              pressed ? styles.pressed : undefined
            ]}
          >
            <AppText variant="caption" tone={isSelected ? 'inverse' : 'primary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function toMetricPoints(
  entries: ProgressEntry[],
  key: 'bodyFatPercent' | 'weightKg'
): TrendPoint[] {
  return entries.flatMap((entry) => {
    const value = entry[key];
    return value === null ? [] : [{ date: entry.entryDate, value }];
  });
}

function pickPerformanceSeries(entries: ProgressEntry[]): PerformanceSeries | null {
  const counts = new Map<string, { count: number; name: string; unit: string }>();

  for (const entry of entries) {
    for (const metric of entry.performanceMetrics) {
      const key = metricKey(metric);
      const existing = counts.get(key);
      counts.set(key, {
        count: existing ? existing.count + 1 : 1,
        name: metric.name,
        unit: metric.unit
      });
    }
  }

  const selected = Array.from(counts.entries()).sort((left, right) => {
    if (right[1].count !== left[1].count) return right[1].count - left[1].count;
    return left[1].name.localeCompare(right[1].name);
  })[0];

  if (!selected) return null;

  const [selectedKey, descriptor] = selected;
  const points = entries.flatMap((entry) => {
    const metric = entry.performanceMetrics.find((item) => metricKey(item) === selectedKey);
    return metric ? [{ date: entry.entryDate, value: metric.value }] : [];
  });

  return {
    name: descriptor.name,
    points,
    unit: descriptor.unit
  };
}

function metricKey(metric: PerformanceMetric): string {
  return `${metric.name.trim().toLowerCase()}::${metric.unit.trim().toLowerCase()}`;
}

function calculateDelta(points: TrendPoint[]): number | null {
  const first = points[0];
  const latest = points[points.length - 1];
  return first && latest ? latest.value - first.value : null;
}

function formatDelta(value: number | null, unit: string): string {
  if (value === null) return 'No data';
  if (value === 0) return `0 ${unit}`;
  return `${value > 0 ? '+' : ''}${formatNumber(value)} ${unit}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function goalTitle(goal?: Goal): string {
  if (goal === 'cut') return 'Cut trend';
  if (goal === 'bulk') return 'Bulk trend';
  if (goal === 'maintain') return 'Maintenance trend';
  return 'Goal trend';
}

function goalOrientation(goal?: Goal): string {
  if (goal === 'cut') return 'Weight and body fat down, performance steady';
  if (goal === 'bulk') return 'Weight and performance up';
  if (goal === 'maintain') return 'Stable bodyweight, performance up';
  return 'Complete your profile to orient progress';
}

function compareByDate(left: ProgressEntry, right: ProgressEntry): number {
  return left.entryDate.localeCompare(right.entryDate);
}

function todayDate(): string {
  return formatDate(new Date());
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days + 1);
  return formatDate(date);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function readErrorMessage(error: unknown, fallback: string): string {
  return readAppErrorMessage(error, fallback);
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
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
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
  sectionTitle: {
    flex: 1,
    gap: spacing.xs
  },
  entryPill: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  rangeGroup: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden'
  },
  rangeButton: {
    minWidth: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  rangeButtonSelected: {
    backgroundColor: colors.primary
  },
  pressed: {
    opacity: 0.76
  }
});
