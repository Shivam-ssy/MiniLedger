export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentForeground: string;
  accentTint: string;
  overdue: string;
  overdueTint: string;
  repaid: string;
  repaidTint: string;
  warning: string;
  warningTint: string;
  white: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  background: '#F8F6F0',
  surface: '#FFFFFF',
  surfaceMuted: '#EFECE4',
  textPrimary: '#161716',
  textSecondary: '#636662',
  textTertiary: '#8E918C',
  border: '#E5E2D9',
  borderStrong: '#D2CEC3',
  accent: '#164E2E',
  accentForeground: '#FFFFFF',
  accentTint: '#EAF4EE',
  overdue: '#C53B27',
  overdueTint: '#FBEAE8',
  repaid: '#4B6354',
  repaidTint: '#EDF3EE',
  warning: '#B45309',
  warningTint: '#FEF3C7',
  white: '#FFFFFF',
  overlay: 'rgba(22, 23, 22, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#121312',
  surface: '#1B1D1C',
  surfaceMuted: '#262927',
  textPrimary: '#F3F4F1',
  textSecondary: '#A3A7A1',
  textTertiary: '#6A6E68',
  border: '#2E3230',
  borderStrong: '#424845',
  accent: '#34D399',
  accentForeground: '#09291B',
  accentTint: '#132E21',
  overdue: '#F87171',
  overdueTint: '#361918',
  repaid: '#9CA3AF',
  repaidTint: '#1F2421',
  warning: '#FBBF24',
  warningTint: '#3B2F10',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.75)',
};
