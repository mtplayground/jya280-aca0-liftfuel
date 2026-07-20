import { StyleSheet, View } from 'react-native';
import type { DimensionValue } from 'react-native';

import { AppText } from '../../../components/ui';
import { colors, radius, spacing } from '../../../theme';

type MacroProgressRowProps = {
  color: string;
  label: string;
  remaining: number;
  target: number;
  total: number;
  unit: string;
};

export function MacroProgressRow({
  color,
  label,
  remaining,
  target,
  total,
  unit
}: MacroProgressRowProps) {
  const progress = target > 0 ? Math.min(total / target, 1.25) : 0;
  const width = `${Math.min(progress, 1) * 100}%` as DimensionValue;
  const remainingLabel = remaining >= 0
    ? `${formatNumber(remaining)} ${unit} left`
    : `${formatNumber(Math.abs(remaining))} ${unit} over`;

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption" tone={remaining >= 0 ? 'muted' : 'warning'}>
          {remainingLabel}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { backgroundColor: color, width }]} />
      </View>
      <AppText variant="caption" tone="muted">
        {formatNumber(total)} / {formatNumber(target)} {unit}
      </AppText>
    </View>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
  fill: {
    borderRadius: radius.sm,
    height: '100%'
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  row: {
    gap: spacing.sm
  },
  track: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    height: 8,
    overflow: 'hidden'
  }
});
