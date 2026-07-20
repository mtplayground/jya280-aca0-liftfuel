import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';

import { AppText, Button, Input } from '../../../components/ui';
import type { AuthStackParamList } from '../../../navigation/types';
import { requestPasswordReset } from '../sessionService';
import { AuthFormShell } from './AuthFormShell';

type PasswordResetScreenProps = NativeStackScreenProps<AuthStackParamList, 'PasswordReset'>;

export function PasswordResetScreen({ navigation }: PasswordResetScreenProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasAccepted, setWasAccepted] = useState(false);

  const submit = async () => {
    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    setFormError(null);
    setWasAccepted(false);

    if (nextEmailError) return;

    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase(), '/');
      setWasAccepted(true);
    } catch {
      setFormError('Unable to send account access email. Try again shortly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormShell
      error={formError}
      footerActionLabel="Back to sign in"
      footerLabel="Remembered your account?"
      onFooterAction={() => navigation.navigate('SignIn')}
      subtitle="Enter the email address tied to your account."
      title="Reset access"
    >
      <Input
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={emailError}
        keyboardType="email-address"
        label="Email"
        onBlur={() => setEmailError(validateEmail(email))}
        onChangeText={(value) => {
          setEmail(value);
          if (emailError) setEmailError(validateEmail(value));
        }}
        placeholder="you@example.com"
        textContentType="emailAddress"
        value={email}
      />
      <Button disabled={isSubmitting} onPress={submit}>
        {isSubmitting ? 'Sending...' : 'Send email'}
      </Button>
      {wasAccepted ? (
        <AppText variant="caption" tone="success">
          Request accepted. Check your email for the secure access link.
        </AppText>
      ) : null}
    </AuthFormShell>
  );
}

function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  return undefined;
}
