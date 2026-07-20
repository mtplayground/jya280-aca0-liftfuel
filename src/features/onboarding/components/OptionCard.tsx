import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../../components/ui';
import { colors, radius, spacing } from '../../../theme';

type OptionCardProps = PropsWithChildren<{
  description?: string;
  isSelected: boolean;
  onPress: () => void;
  title: string;
}>;

export function OptionCard({
  children,
  description,
  isSelected,
  onPress,
  title
}: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isSelected ? styles.selected : undefined,
        pressed ? styles.pressed : undefined
      ]}
    >
      <View style={styles.text}>
        <AppText variant="label">{title}</AppText>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  selected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  pressed: {
    opacity: 0.84
  },
  text: {
    gap: spacing.xs
  }
});
