export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  PasswordReset: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
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
  Onboarding: undefined;
  PasswordReset: undefined;
  Profile: undefined;
  SignIn: undefined;
  SignUp: undefined;
};

export type SessionState = {
  hasAccount: boolean;
  hasCompletedProfile: boolean;
  isLoading: boolean;
};
