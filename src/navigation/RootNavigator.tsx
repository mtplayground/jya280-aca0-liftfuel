import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';

import { PlaceholderScreen } from '../screens/PlaceholderScreen';
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

function AuthNavigator({ onSignIn }: { onSignIn: () => void }) {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="SignIn" options={{ title: 'Sign in' }}>
        {() => (
          <PlaceholderScreen
            title="Sign in to LiftFuel"
            subtitle="Account flows will connect to the shared auth service in the auth issues."
            actionLabel="Continue as signed in"
            onAction={onSignIn}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator({ onComplete }: { onComplete: () => void }) {
  return (
    <OnboardingStack.Navigator>
      <OnboardingStack.Screen name="Welcome" options={{ title: 'Welcome' }}>
        {({ navigation }) => (
          <PlaceholderScreen
            title="Set up LiftFuel"
            subtitle="The onboarding flow will collect goals, body stats, training rhythm, and unit preferences."
            actionLabel="Start profile setup"
            onAction={() => navigation.navigate('ProfileSetup')}
          />
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen name="ProfileSetup" options={{ title: 'Profile setup' }}>
        {() => (
          <PlaceholderScreen
            title="Profile setup"
            subtitle="Profile fields will be implemented in the onboarding and profile issues."
            actionLabel="Mark onboarding complete"
            onAction={onComplete}
          />
        )}
      </OnboardingStack.Screen>
    </OnboardingStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator>
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
      <AppStack.Screen name="Profile" options={{ title: 'Profile' }}>
        {() => (
          <PlaceholderScreen
            title="Profile"
            subtitle="Editable profile details will be added in the profile screen issue."
          />
        )}
      </AppStack.Screen>
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const [session, setSession] = useState<SessionState>({
    hasAccount: false,
    hasCompletedProfile: false
  });

  const routeKey = useMemo(() => {
    if (!session.hasAccount) return 'auth';
    if (!session.hasCompletedProfile) return 'onboarding';
    return 'app';
  }, [session]);

  return (
    <NavigationContainer key={routeKey}>
      {!session.hasAccount ? (
        <AuthNavigator
          onSignIn={() =>
            setSession({
              hasAccount: true,
              hasCompletedProfile: false
            })
          }
        />
      ) : !session.hasCompletedProfile ? (
        <OnboardingNavigator
          onComplete={() =>
            setSession({
              hasAccount: true,
              hasCompletedProfile: true
            })
          }
        />
      ) : (
        <AppNavigator />
      )}
    </NavigationContainer>
  );
}
