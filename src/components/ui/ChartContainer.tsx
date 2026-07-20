import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { AppText } from './AppText';

type ChartContainerProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}>;

export function ChartContainer({
  children,
  title,
  subtitle,
  style
}: ChartContainerProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <AppText variant="label">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 220,
    padding: spacing.lg
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg
  },
  body: {
    flex: 1,
    minHeight: 156
  }
});
