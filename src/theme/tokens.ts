export const colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#D6DEE8',
  borderStrong: '#B8C3D1',
  text: '#111827',
  textMuted: '#5B6472',
  textSubtle: '#7A8494',
  inverseText: '#FFFFFF',
  primary: '#1F5FA8',
  primaryPressed: '#184D87',
  primarySoft: '#E7F0FA',
  success: '#26735A',
  successSoft: '#E5F3EE',
  warning: '#9A651B',
  warningSoft: '#F8EEDB',
  danger: '#B13A3A',
  dangerSoft: '#F7E4E4',
  chartProtein: '#26735A',
  chartCarbs: '#B17A1A',
  chartFat: '#7B5EA7',
  chartCalories: '#1F5FA8'
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8
} as const;

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800'
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700'
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400'
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700'
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600'
  },
  metric: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800'
  },
  metricSmall: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800'
  }
} as const;

export const shadows = {
  none: {
    shadowOpacity: 0,
    elevation: 0
  },
  card: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1
  }
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows
} as const;

export type Theme = typeof theme;
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
