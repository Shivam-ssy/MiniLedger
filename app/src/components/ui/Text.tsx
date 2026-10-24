import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme, TypographyVariant } from '../../theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'accent'
    | 'overdue'
    | 'repaid'
    | 'warning'
    | 'white';
  tabularNums?: boolean;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  tabularNums = false,
  align,
  style,
  children,
  ...rest
}) => {
  const { colors, typography, tabularNumbers } = useTheme();

  const colorMap: Record<NonNullable<TextProps['color']>, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    accent: colors.accent,
    overdue: colors.overdue,
    repaid: colors.repaid,
    warning: colors.warning,
    white: colors.white,
  };

  const resolvedColor = colorMap[color] || colors.textPrimary;

  return (
    <RNText
      style={[
        typography[variant],
        { color: resolvedColor },
        align ? { textAlign: align } : null,
        tabularNums ? tabularNumbers : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};
