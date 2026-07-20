import { StyleSheet, View } from 'react-native';

import { AppText, ChartContainer } from '../../../components/ui';
import { colors, radius, spacing } from '../../../theme';

export type TrendPoint = {
  date: string;
  value: number;
};

type TrendChartProps = {
  color: string;
  emptyLabel: string;
  points: TrendPoint[];
  title: string;
  unit: string;
};

export function TrendChart({
  color,
  emptyLabel,
  points,
  title,
  unit
}: TrendChartProps) {
  const first = points[0];
  const latest = points[points.length - 1];
  const delta = first && latest ? latest.value - first.value : 0;
  const values = points.map((point) => point.value);
  const minimum = values.length > 0 ? Math.min(...values) : 0;
  const maximum = values.length > 0 ? Math.max(...values) : 0;
  const range = maximum - minimum || 1;
  const visiblePoints = points.slice(-16);

  return (
    <ChartContainer
      title={title}
      subtitle={latest ? `${formatValue(latest.value)} ${unit} latest` : emptyLabel}
      style={styles.chart}
    >
      {visiblePoints.length > 0 ? (
        <View style={styles.chartBody}>
          <View style={styles.plot}>
            {visiblePoints.map((point) => {
              const height = 16 + ((point.value - minimum) / range) * 116;
              return (
                <View key={point.date} style={styles.barSlot}>
                  <View style={[styles.bar, { backgroundColor: color, height }]} />
                </View>
              );
            })}
          </View>
          <View style={styles.footer}>
            <AppText variant="caption" tone="muted">
              {formatShortDate(first?.date)}
            </AppText>
            <AppText variant="caption" tone={deltaTone(delta)}>
              {formatSigned(delta)} {unit}
            </AppText>
            <AppText variant="caption" tone="muted">
              {formatShortDate(latest?.date)}
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <AppText variant="label" tone="muted">
            {emptyLabel}
          </AppText>
        </View>
      )}
    </ChartContainer>
  );
}

function deltaTone(delta: number): 'default' | 'muted' | 'success' | 'warning' {
  if (delta === 0) return 'muted';
  return delta > 0 ? 'success' : 'warning';
}

function formatSigned(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : ''}${formatValue(value)}`;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatShortDate(date?: string): string {
  if (!date) return '';
  const [, month, day] = date.split('-');
  return `${month}/${day}`;
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: radius.sm,
    minHeight: 8,
    width: '100%'
  },
  barSlot: {
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 8
  },
  chart: {
    minHeight: 248
  },
  chartBody: {
    flex: 1,
    gap: spacing.md
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    flex: 1,
    justifyContent: 'center',
    minHeight: 156
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  plot: {
    alignItems: 'flex-end',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 148
  }
});
