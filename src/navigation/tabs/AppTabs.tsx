import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '../../components/ui';
import { MealPhotoCaptureScreen } from '../../features/foodLog';
import { PlaceholderScreen } from '../../screens/PlaceholderScreen';
import { colors, spacing } from '../../theme';
import type { AppStackParamList, MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.surface
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '700'
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        },
        headerRight: () => <ProfileHeaderButton />
      }}
    >
      <Tab.Screen name="Home">
        {() => (
          <PlaceholderScreen
            title="Home"
            subtitle="Daily status, streaks, and quick actions will land here as the core features are built."
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Log" options={{ title: 'Log meal' }}>
        {() => <MealPhotoCaptureScreen />}
      </Tab.Screen>
      <Tab.Screen name="Plan">
        {() => (
          <PlaceholderScreen
            title="Plan"
            subtitle="Training and rest day calorie and macro targets will be shown here."
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Trends">
        {() => (
          <PlaceholderScreen
            title="Trends"
            subtitle="Progress charts and history will be added after progress capture exists."
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function ProfileHeaderButton() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigation.navigate('Profile')}
      style={({ pressed }) => [styles.profileButton, pressed ? styles.pressed : undefined]}
    >
      <AppText variant="caption" tone="primary">
        Profile
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  pressed: {
    opacity: 0.72
  }
});
