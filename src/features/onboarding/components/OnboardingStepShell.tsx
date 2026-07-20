import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen } from '../../../components/ui';
import { colors, spacing } from '../../../theme';

type OnboardingStepShellProps = PropsWithChildren<{
  canGoBack: boolean;
  error?: string | null;
  isSaving?: boolean;
  onBack: () => void;
  onNext: () => void;
  stepIndex: number;
  stepTotal: number;
  subtitle: string;
  title: string;
}>;

export function OnboardingStepShell({
  canGoBack,
  children,
  error,
  isSaving = false,
  onBack,
  onNext,
  stepIndex,
  stepTotal,
  subtitle,
  title
}: OnboardingStepShellProps) {
  const isFinalStep = stepIndex === stepTotal - 1;

  return (
    <Screen contentStyle={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${((stepIndex + 1) / stepTotal) * 100}%` }
              ]}
            />
          </View>
          <AppText variant="caption" tone="primary" style={styles.eyebrow}>
            Step {stepIndex + 1} of {stepTotal}
          </AppText>
          <AppText variant="heading">{title}</AppText>
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

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        <View style={styles.actions}>
          {canGoBack ? (
            <Button variant="secondary" onPress={onBack} style={styles.actionButton}>
              Back
            </Button>
          ) : null}
          <Button disabled={isSaving} onPress={onNext} style={styles.actionButton}>
            {isSaving ? 'Saving...' : isFinalStep ? 'Save profile' : 'Continue'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.xl
  },
  keyboard: {
    flex: 1,
    gap: spacing.xl
  },
  header: {
    gap: spacing.md
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 6,
    overflow: 'hidden'
  },
  progressFill: {
    backgroundColor: colors.primary,
    height: '100%'
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
  body: {
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md
  },
  actionButton: {
    flex: 1
  }
});
