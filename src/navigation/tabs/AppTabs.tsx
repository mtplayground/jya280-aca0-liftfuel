import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { PlaceholderScreen } from '../../screens/PlaceholderScreen';
import type { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B'
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
        {() => (
          <PlaceholderScreen
            title="Log meal"
            subtitle="Photo capture, AI estimates, manual search, and food edits will be added here."
          />
        )}
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
