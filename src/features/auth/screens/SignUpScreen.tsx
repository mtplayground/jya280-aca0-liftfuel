import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';

import { Button } from '../../../components/ui';
import type { AuthStackParamList } from '../../../navigation/types';
import { refreshSession, startSignUp } from '../sessionService';
import { AuthFormShell } from './AuthFormShell';

type SignUpScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUp'> & {
  onAuthenticated: () => void;
};

export function SignUpScreen({ navigation, onAuthenticated }: SignUpScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const openSignUp = async () => {
    setError(null);
    setIsOpening(true);
    try {
      await startSignUp('/');
    } catch {
      setError('Unable to open account creation. Check your connection and try again.');
    } finally {
      setIsOpening(false);
    }
  };

  const checkSession = async () => {
    setError(null);
    setIsChecking(true);
    try {
      const session = await refreshSession();
      if (!session) {
        setError('No active session found.');
        return;
      }

      onAuthenticated();
    } catch {
      setError('Unable to refresh your session.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <AuthFormShell
      error={error}
      footerActionLabel="Sign in"
      footerLabel="Already have an account?"
      onFooterAction={() => navigation.navigate('SignIn')}
      subtitle="Create an account to save your nutrition data and keep it scoped to you."
      title="Create account"
    >
      <Button disabled={isOpening} onPress={openSignUp}>
        {isOpening ? 'Opening...' : 'Continue'}
      </Button>
      <Button disabled={isChecking} variant="secondary" onPress={checkSession}>
        {isChecking ? 'Checking...' : 'Refresh session'}
      </Button>
    </AuthFormShell>
  );
}
