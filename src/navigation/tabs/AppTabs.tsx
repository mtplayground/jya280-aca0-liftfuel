import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui';
import { LogMealScreen } from '../../features/foodLog';
import { HomeScreen } from '../../features/home';
import { PlanScreen } from '../../features/plan';
import { TrendsScreen } from '../../features/trends';
import { colors, spacing } from '../../theme';
import type { AppStackParamList, MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function AppTabs({ isAuthenticated }: { isAuthenticated: boolean }) {
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
        headerRight: () => <HeaderActions isAuthenticated={isAuthenticated} />
      }}
    >
      <Tab.Screen name="Home" options={{ title: 'Home' }}>
        {() => <HomeScreen />}
      </Tab.Screen>
      <Tab.Screen name="Log" options={{ title: 'Log meal' }}>
        {() => <LogMealScreen />}
      </Tab.Screen>
      <Tab.Screen name="Plan" options={{ title: 'Plan' }}>
        {() => <PlanScreen />}
      </Tab.Screen>
      <Tab.Screen name="Trends">
        {() => <TrendsScreen />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function HeaderActions({ isAuthenticated }: { isAuthenticated: boolean }) {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();

  return (
    <View style={styles.headerActions}>
      {!isAuthenticated ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('SignIn')}
          style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : undefined]}
        >
          <AppText variant="caption" tone="primary">
            Sign in
          </AppText>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Profile')}
        style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : undefined]}
      >
        <AppText variant="caption" tone="primary">
          Profile
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.sm
  },
  headerButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  pressed: {
    opacity: 0.72
  }
});
