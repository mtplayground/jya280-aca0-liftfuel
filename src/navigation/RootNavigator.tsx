import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';

import { AppText, Screen } from '../components/ui';
import {
  getStoredSession,
  PasswordResetScreen,
  refreshSession,
  SignInScreen,
  SignUpScreen
} from '../features/auth';
import { OnboardingFlowScreen } from '../features/onboarding';
import { getProfile, ProfileScreen } from '../features/profile';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { colors, navigationTheme, spacing } from '../theme';
import { AppTabs } from './tabs/AppTabs';
import type { AppStackParamList, SessionState } from './types';

const AppStack = createNativeStackNavigator<AppStackParamList>();

function AppNavigator({
  isAuthenticated,
  onAuthenticated,
  onOnboardingComplete
}: {
  isAuthenticated: boolean;
  onAuthenticated: () => Promise<void>;
  onOnboardingComplete: () => void;
}) {
  return (
    <AppStack.Navigator screenOptions={stackScreenOptions}>
      <AppStack.Screen name="MainTabs" options={{ headerShown: false }}>
        {() => <AppTabs isAuthenticated={isAuthenticated} />}
      </AppStack.Screen>
      <AppStack.Screen name="MealDetail" options={{ title: 'Meal detail' }}>
        {() => (
          <PlaceholderScreen
            title="Meal detail"
            subtitle="Meal inspection and editing will be added after the food log model exists."
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="Profile" options={{ title: 'Profile' }}>
        {() => <ProfileScreen />}
      </AppStack.Screen>
      <AppStack.Screen name="SignIn" options={{ title: 'Sign in' }}>
        {(props) => (
          <SignInScreen
            {...props}
            onAuthenticated={() => {
              void onAuthenticated().then(() => props.navigation.navigate('MainTabs'));
            }}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="SignUp" options={{ title: 'Create account' }}>
        {(props) => (
          <SignUpScreen
            {...props}
            onAuthenticated={() => {
              void onAuthenticated().then(() => props.navigation.navigate('MainTabs'));
            }}
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen
        name="PasswordReset"
        component={PasswordResetScreen}
        options={{ title: 'Reset access' }}
      />
      <AppStack.Screen name="Onboarding" options={{ title: 'Set up profile' }}>
        {(props) => (
          <OnboardingFlowScreen
            onComplete={() => {
              onOnboardingComplete();
              props.navigation.navigate('MainTabs');
            }}
          />
        )}
      </AppStack.Screen>
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const [session, setSession] = useState<SessionState>({
    hasAccount: false,
    hasCompletedProfile: false,
    isLoading: true
  });

  const markAuthenticated = useCallback(async () => {
    setSession({
      hasAccount: true,
      hasCompletedProfile: false,
      isLoading: true
    });

    try {
      const profile = await getProfile();
      setSession({
        hasAccount: true,
        hasCompletedProfile: Boolean(profile),
        isLoading: false
      });
    } catch {
      setSession({
        hasAccount: true,
        hasCompletedProfile: false,
        isLoading: false
      });
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function hydrateSession() {
      const storedSession = await getStoredSession();
      if (isActive && storedSession) {
        setSession({
          hasAccount: true,
          hasCompletedProfile: false,
          isLoading: true
        });
      }

      try {
        const refreshedSession = await refreshSession();
        if (!isActive) return;

        if (!refreshedSession) {
          setSession({
            hasAccount: false,
            hasCompletedProfile: false,
            isLoading: false
          });
          return;
        }

        const profile = await getProfile();
        if (!isActive) return;

        setSession({
          hasAccount: true,
          hasCompletedProfile: Boolean(profile),
          isLoading: false
        });
      } catch {
        if (!isActive) return;

        setSession({
          hasAccount: Boolean(storedSession),
          hasCompletedProfile: false,
          isLoading: false
        });
      }
    }

    hydrateSession();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <NavigationContainer theme={navigationTheme}>
      {session.isLoading ? (
        <LoadingScreen />
      ) : (
        <AppNavigator
          isAuthenticated={session.hasAccount}
          onAuthenticated={markAuthenticated}
          onOnboardingComplete={() =>
            setSession({
              hasAccount: true,
              hasCompletedProfile: true,
              isLoading: false
            })
          }
        />
      )}
    </NavigationContainer>
  );
}

function LoadingScreen() {
  return (
    <Screen contentStyle={loadingStyles.screen}>
      <AppText variant="caption" tone="primary" style={loadingStyles.eyebrow}>
        LiftFuel
      </AppText>
      <AppText variant="heading">Checking session</AppText>
    </Screen>
  );
}

const stackScreenOptions = {
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: colors.surface
  },
  headerTintColor: colors.text,
  headerTitleStyle: {
    color: colors.text,
    fontWeight: '700' as const
  }
};

const loadingStyles = {
  screen: {
    gap: spacing.md,
    justifyContent: 'center' as const
  },
  eyebrow: {
    textTransform: 'uppercase' as const
  }
};
