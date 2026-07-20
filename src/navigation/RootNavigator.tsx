import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppText, Screen } from '../components/ui';
import {
  getStoredSession,
  PasswordResetScreen,
  refreshSession,
  SignInScreen,
  SignUpScreen
} from '../features/auth';
import { MealPhotoCaptureScreen } from '../features/foodLog';
import { OnboardingFlowScreen } from '../features/onboarding';
import { getProfile, ProfileScreen } from '../features/profile';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { colors, navigationTheme, spacing } from '../theme';
import { AppTabs } from './tabs/AppTabs';
import type {
  AppStackParamList,
  AuthStackParamList,
  OnboardingStackParamList,
  SessionState
} from './types';

const AppStack = createNativeStackNavigator<AppStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

function AuthNavigator({ onAuthenticated }: { onAuthenticated: () => void }) {
  return (
    <AuthStack.Navigator screenOptions={stackScreenOptions}>
      <AuthStack.Screen name="SignIn" options={{ title: 'Sign in' }}>
        {(props) => (
          <SignInScreen
            {...props}
            onAuthenticated={onAuthenticated}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="SignUp" options={{ title: 'Create account' }}>
        {(props) => (
          <SignUpScreen
            {...props}
            onAuthenticated={onAuthenticated}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen
        name="PasswordReset"
        component={PasswordResetScreen}
        options={{ title: 'Reset access' }}
      />
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator({ onComplete }: { onComplete: () => void }) {
  return (
    <OnboardingStack.Navigator screenOptions={stackScreenOptions}>
      <OnboardingStack.Screen name="Welcome" options={{ title: 'Set up profile' }}>
        {() => (
          <OnboardingFlowScreen
            onComplete={onComplete}
          />
        )}
      </OnboardingStack.Screen>
    </OnboardingStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={stackScreenOptions}>
      <AppStack.Screen
        name="MainTabs"
        component={AppTabs}
        options={{ headerShown: false }}
      />
      <AppStack.Screen name="MealDetail" options={{ title: 'Meal detail' }}>
        {() => (
          <PlaceholderScreen
            title="Meal detail"
            subtitle="Meal inspection and editing will be added after the food log model exists."
          />
        )}
      </AppStack.Screen>
      <AppStack.Screen name="MealPhotoCapture" options={{ title: 'Meal photo' }}>
        {() => <MealPhotoCaptureScreen />}
      </AppStack.Screen>
      <AppStack.Screen name="Profile" options={{ title: 'Profile' }}>
        {() => <ProfileScreen />}
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

  const routeKey = useMemo(() => {
    if (session.isLoading) return 'loading';
    if (!session.hasAccount) return 'auth';
    if (!session.hasCompletedProfile) return 'onboarding';
    return 'app';
  }, [session]);

  return (
    <NavigationContainer key={routeKey} theme={navigationTheme}>
      {session.isLoading ? (
        <LoadingScreen />
      ) : !session.hasAccount ? (
        <AuthNavigator
          onAuthenticated={markAuthenticated}
        />
      ) : !session.hasCompletedProfile ? (
        <OnboardingNavigator
          onComplete={() =>
            setSession({
              hasAccount: true,
              hasCompletedProfile: true,
              isLoading: false
            })
          }
        />
      ) : (
        <AppNavigator />
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
