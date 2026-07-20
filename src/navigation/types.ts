export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  PasswordReset: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  ProfileSetup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Log: undefined;
  Plan: undefined;
  Trends: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  MealDetail: { mealId: string };
  Profile: undefined;
};

export type SessionState = {
  hasAccount: boolean;
  hasCompletedProfile: boolean;
  isLoading: boolean;
};
