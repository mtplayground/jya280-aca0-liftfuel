import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '../../../components/ui';
import { colors, spacing } from '../../../theme';

type AuthFormShellProps = PropsWithChildren<{
  error?: string | null;
  footerActionLabel?: string;
  footerLabel?: string;
  onFooterAction?: () => void;
  subtitle: string;
  title: string;
}>;

export function AuthFormShell({
  children,
  error,
  footerActionLabel,
  footerLabel,
  onFooterAction,
  subtitle,
  title
}: AuthFormShellProps) {
  return (
    <Screen contentStyle={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <Card style={styles.card}>
          <View style={styles.header}>
            <AppText variant="caption" tone="primary" style={styles.eyebrow}>
              LiftFuel
            </AppText>
            <AppText variant="display">{title}</AppText>
            <AppText variant="body" tone="muted">
              {subtitle}
            </AppText>
          </View>

          {error ? (
            <View accessibilityRole="alert" style={styles.error}>
              <AppText variant="caption" tone="danger">
                {error}
              </AppText>
            </View>
          ) : null}

          <View style={styles.form}>{children}</View>

          {footerLabel && footerActionLabel && onFooterAction ? (
            <View style={styles.footer}>
              <AppText variant="caption" tone="muted">
                {footerLabel}
              </AppText>
              <Button variant="ghost" onPress={onFooterAction} style={styles.footerButton}>
                {footerActionLabel}
              </Button>
            </View>
          ) : null}
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center'
  },
  keyboard: {
    width: '100%'
  },
  card: {
    gap: spacing.xl
  },
  header: {
    gap: spacing.md
  },
  eyebrow: {
    textTransform: 'uppercase'
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  form: {
    gap: spacing.md
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm
  },
  footerButton: {
    minWidth: 160
  }
});
