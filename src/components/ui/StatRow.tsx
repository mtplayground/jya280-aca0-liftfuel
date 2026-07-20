import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../theme';
import { AppText } from './AppText';

type StatRowProps = {
  label: string;
  value: string;
  accessory?: ReactNode;
  helperText?: string;
  style?: StyleProp<ViewStyle>;
};

export function StatRow({
  accessory,
  helperText,
  label,
  style,
  value
}: StatRowProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.textGroup}>
        <AppText variant="caption" tone="muted" style={styles.label}>
          {label}
        </AppText>
        {helperText ? (
          <AppText variant="caption" tone="subtle">
            {helperText}
          </AppText>
        ) : null}
      </View>
      <View style={styles.valueGroup}>
        <AppText variant="metricSmall">{value}</AppText>
        {accessory}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: spacing.md
  },
  textGroup: {
    flex: 1,
    gap: spacing.xs
  },
  label: {
    textTransform: 'uppercase'
  },
  valueGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm
  }
});
