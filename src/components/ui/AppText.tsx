import type { PropsWithChildren } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '../../theme';

type TextTone = 'default' | 'muted' | 'subtle' | 'inverse' | 'primary' | 'success' | 'warning' | 'danger';
type TextVariant = keyof typeof typography;

type AppTextProps = PropsWithChildren<{
  variant?: TextVariant;
  tone?: TextTone;
  style?: StyleProp<TextStyle>;
}>;

const toneColor: Record<TextTone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  inverse: colors.inverseText,
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger
};

export function AppText({
  children,
  variant = 'body',
  tone = 'default',
  style
}: AppTextProps) {
  return (
    <Text style={[styles.base, typography[variant], { color: toneColor[tone] }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0
  }
});
