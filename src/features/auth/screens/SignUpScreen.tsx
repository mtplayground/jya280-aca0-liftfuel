import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { Button } from '../../../components/ui';
import type { AuthStackParamList } from '../../../navigation/types';
import { hasAuthReturnParameters, refreshSession, startSignUp } from '../sessionService';
import { AuthFormShell } from './AuthFormShell';

type SignUpScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUp'> & {
  onAuthenticated: () => void;
};

export function SignUpScreen({ navigation, onAuthenticated }: SignUpScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const isRefreshingRef = useRef(false);

  const checkSession = useCallback(async (options: { showNoSessionMessage: boolean }) => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setError(null);
    try {
      const session = await refreshSession();
      if (!session) {
        if (options.showNoSessionMessage) {
          setError('No active session found.');
        }
        return;
      }

      onAuthenticated();
    } catch {
      if (options.showNoSessionMessage) {
        setError('Unable to refresh your session.');
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onAuthenticated]);

  const checkSessionManually = async () => {
    setIsChecking(true);
    try {
      await checkSession({ showNoSessionMessage: true });
    } finally {
      setIsChecking(false);
    }
  };

  const openSignUp = async () => {
    setError(null);
    setIsOpening(true);
    try {
      await startSignUp('/');
      setTimeout(() => {
        void checkSession({ showNoSessionMessage: false });
      }, 500);
    } catch {
      setError('Unable to open account creation. Check your connection and try again.');
    } finally {
      setIsOpening(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void checkSession({ showNoSessionMessage: false });
    }, [checkSession])
  );

  useEffect(() => {
    let isActive = true;

    async function refreshAfterAuthCallback() {
      if (await hasAuthReturnParameters()) {
        if (isActive) {
          void checkSession({ showNoSessionMessage: false });
        }
      }
    }

    void refreshAfterAuthCallback();

    return () => {
      isActive = false;
    };
  }, [checkSession]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkSession({ showNoSessionMessage: false });
      }
    };

    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [checkSession]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkSession({ showNoSessionMessage: false });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkSession]);

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
      <Button disabled={isChecking} variant="secondary" onPress={checkSessionManually}>
        {isChecking ? 'Checking...' : 'Refresh session'}
      </Button>
    </AuthFormShell>
  );
}
