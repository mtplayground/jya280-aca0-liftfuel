import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '../components/ui';
import { spacing } from '../theme';

type PlaceholderScreenProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function PlaceholderScreen({
  title,
  subtitle,
  actionLabel,
  onAction
}: PlaceholderScreenProps) {
  return (
    <Screen contentStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.copy}>
          <AppText variant="caption" tone="primary" style={styles.eyebrow}>
            LiftFuel
          </AppText>
          <AppText variant="display">{title}</AppText>
          <AppText variant="body" tone="muted">
            {subtitle}
          </AppText>
        </View>
        {actionLabel && onAction ? (
          <Button onPress={onAction} style={styles.action}>
            {actionLabel}
          </Button>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center'
  },
  card: {
    gap: spacing.xl
  },
  copy: {
    gap: spacing.md
  },
  eyebrow: {
    textTransform: 'uppercase'
  },
  action: {
    alignSelf: 'flex-start',
    minWidth: 180
  }
});
