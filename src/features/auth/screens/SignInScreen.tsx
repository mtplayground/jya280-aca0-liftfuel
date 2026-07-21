import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { readAuthSessionFailureMessage } from '../../../api/errorMessages';
import { Button } from '../../../components/ui';
import type { AuthStackParamList } from '../../../navigation/types';
import {
  hasAuthReturnParameters,
  logAuthSessionRefreshFailure,
  refreshSessionForAuthFlow,
  startSignIn
} from '../sessionService';
import { AuthFormShell } from './AuthFormShell';

type SignInScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignIn'> & {
  onAuthenticated: () => void;
};

export function SignInScreen({ navigation, onAuthenticated }: SignInScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const hasPendingAuthReturnRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const checkSession = useCallback(async (options: {
    showFailureMessage: boolean;
    source: string;
  }) => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setError(null);
    try {
      const result = await refreshSessionForAuthFlow();
      if (result.status === 'authenticated') {
        hasPendingAuthReturnRef.current = false;
        onAuthenticated();
        return;
      }

      if (options.showFailureMessage) {
        logAuthSessionRefreshFailure(options.source, result.failure);
        setError(readAuthSessionFailureMessage(result.failure));
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onAuthenticated]);

  const checkSessionManually = async () => {
    setIsChecking(true);
    try {
      await checkSession({
        showFailureMessage: true,
        source: 'manual_refresh'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const openSignIn = async () => {
    setError(null);
    setIsOpening(true);
    hasPendingAuthReturnRef.current = true;
    try {
      await startSignIn('/');
      setTimeout(() => {
        void checkSession({
          showFailureMessage: false,
          source: 'sign_in_button_return'
        });
      }, 500);
    } catch {
      hasPendingAuthReturnRef.current = false;
      setError('Unable to open sign-in. Check your connection and try again.');
    } finally {
      setIsOpening(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void checkSession({
        showFailureMessage: hasPendingAuthReturnRef.current,
        source: 'screen_focus'
      });
    }, [checkSession])
  );

  useEffect(() => {
    let isActive = true;

    async function refreshAfterAuthCallback() {
      if (await hasAuthReturnParameters()) {
        if (isActive) {
          hasPendingAuthReturnRef.current = true;
          void checkSession({
            showFailureMessage: true,
            source: 'auth_callback_params'
          });
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
        void checkSession({
          showFailureMessage: hasPendingAuthReturnRef.current,
          source: 'web_visibility'
        });
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
        void checkSession({
          showFailureMessage: hasPendingAuthReturnRef.current,
          source: 'app_state_active'
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkSession]);

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
      <Button disabled={isChecking} variant="secondary" onPress={checkSessionManually}>
        {isChecking ? 'Checking...' : 'Refresh session'}
      </Button>
      <Button variant="ghost" onPress={() => navigation.navigate('PasswordReset')}>
        Reset access
      </Button>
    </AuthFormShell>
  );
}
