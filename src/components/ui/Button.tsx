import type { PropsWithChildren } from 'react';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = PropsWithChildren<{
  accessibilityLabel?: string;
  disabled?: boolean;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
}>;

export function Button({
  accessibilityLabel,
  children,
  disabled = false,
  onPress,
  style,
  variant = 'primary'
}: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        style
      ]}
    >
      <AppText
        variant="label"
        tone={variant === 'primary' ? 'inverse' : 'primary'}
        style={styles.label}
      >
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent'
  },
  pressed: {
    opacity: 0.82
  },
  disabled: {
    opacity: 0.48
  },
  label: {
    textAlign: 'center'
  }
});
