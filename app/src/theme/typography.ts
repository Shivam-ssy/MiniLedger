import { TextStyle, Platform } from 'react-native';

export const fontFamilies = {
  regular: Platform.select({
    ios: 'Inter-Regular',
    android: 'Inter_400Regular',
    default: 'Inter_400Regular, system-ui, -apple-system, sans-serif',
  }),
  medium: Platform.select({
    ios: 'Inter-Medium',
    android: 'Inter_500Medium',
    default: 'Inter_500Medium, system-ui, -apple-system, sans-serif',
  }),
  semiBold: Platform.select({
    ios: 'Inter-SemiBold',
    android: 'Inter_600SemiBold',
    default: 'Inter_600SemiBold, system-ui, -apple-system, sans-serif',
  }),
  bold: Platform.select({
    ios: 'Inter-Bold',
    android: 'Inter_700Bold',
    default: 'Inter_700Bold, system-ui, -apple-system, sans-serif',
  }),
};

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'title2'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'label';

export const typography: Record<TypographyVariant, TextStyle> = {
  display: {
    fontFamily: fontFamilies.bold,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  title2: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodyMedium: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};

export const tabularNumbers: TextStyle = {
  fontVariant: ['tabular-nums'],
};
