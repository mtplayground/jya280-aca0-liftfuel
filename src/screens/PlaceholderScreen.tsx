import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>LiftFuel</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : undefined
            ]}
          >
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  title: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 38,
    marginBottom: 12
  },
  subtitle: {
    color: '#475569',
    fontSize: 17,
    lineHeight: 25,
    marginBottom: 28
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  buttonPressed: {
    opacity: 0.82
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0
  }
});
