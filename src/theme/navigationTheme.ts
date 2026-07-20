import { DefaultTheme } from '@react-navigation/native';

import { colors } from './tokens';

export const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    border: colors.border,
    card: colors.surface,
    primary: colors.primary,
    text: colors.text,
    notification: colors.danger
  }
};
