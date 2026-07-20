import { forwardRef } from 'react';
import type { TextInputProps as NativeTextInputProps, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, TextInput as NativeTextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { AppText } from './AppText';

type InputProps = NativeTextInputProps & {
  error?: string;
  helperText?: string;
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const Input = forwardRef<NativeTextInput, InputProps>(function Input(
  { containerStyle, error, helperText, label, style, ...props },
  ref
) {
  const describedBy = error || helperText;

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label">{label}</AppText>
      <NativeTextInput
        ref={ref}
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, error ? styles.inputError : undefined, style]}
        {...props}
      />
      {describedBy ? (
        <AppText variant="caption" tone={error ? 'danger' : 'muted'}>
          {describedBy}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body
  },
  inputError: {
    borderColor: colors.danger
  }
});
