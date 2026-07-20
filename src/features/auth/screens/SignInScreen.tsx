import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';

import { Button } from '../../../components/ui';
import type { AuthStackParamList } from '../../../navigation/types';
import { refreshSession, startSignIn } from '../sessionService';
import { AuthFormShell } from './AuthFormShell';

type SignInScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignIn'> & {
  onAuthenticated: () => void;
};

export function SignInScreen({ navigation, onAuthenticated }: SignInScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const openSignIn = async () => {
    setError(null);
    setIsOpening(true);
    try {
      await startSignIn('/');
    } catch {
      setError('Unable to open sign-in. Check your connection and try again.');
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
      footerActionLabel="Create account"
      footerLabel="New to LiftFuel?"
      onFooterAction={() => navigation.navigate('SignUp')}
      subtitle="Access your account to continue logging meals and reviewing your plan."
      title="Sign in"
    >
      <Button disabled={isOpening} onPress={openSignIn}>
        {isOpening ? 'Opening...' : 'Continue'}
      </Button>
      <Button disabled={isChecking} variant="secondary" onPress={checkSession}>
        {isChecking ? 'Checking...' : 'Refresh session'}
      </Button>
      <Button variant="ghost" onPress={() => navigation.navigate('PasswordReset')}>
        Reset access
      </Button>
    </AuthFormShell>
  );
}
