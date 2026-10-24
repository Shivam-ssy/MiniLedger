import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'muted' | 'accent' | 'overdue';
  radiusSize?: 'sm' | 'lg';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  radiusSize = 'sm',
  onPress,
  style,
}) => {
  const { colors, radius, isDark } = useTheme();

  const getBackgroundAndBorder = () => {
    switch (variant) {
      case 'muted':
        return {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
        };
      case 'accent':
        return {
          backgroundColor: colors.accentTint,
          borderColor: colors.accent,
        };
      case 'overdue':
        return {
          backgroundColor: colors.overdueTint,
          borderColor: colors.overdue,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        };
    }
  };

  const { backgroundColor, borderColor } = getBackgroundAndBorder();
  const borderRadius = radius[radiusSize];

  const cardStyle: ViewStyle = {
    backgroundColor,
    borderColor,
    borderWidth: 1,
    borderRadius,
    // Subtle elevation without heavy muddy shadows
    ...Platform.select({
      ios: {
        shadowColor: isDark ? '#000000' : '#161716',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: isDark ? 1 : 1.5,
      },
      web: {
        boxShadow: isDark
          ? '0 2px 8px rgba(0,0,0,0.4)'
          : '0 2px 8px rgba(22,23,22,0.04)',
      } as ViewStyle,
    }),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          cardStyle,
          pressed && { opacity: 0.85 },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.base, cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
