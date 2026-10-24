import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from './Text';

export type BadgeVariant = 'overdue' | 'pending' | 'repaid' | 'neutral' | 'accent';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  icon,
  size = 'md',
  style,
}) => {
  const { colors, radius, spacing } = useTheme();

  const getVariantStyles = (): { bg: string; text: 'overdue' | 'accent' | 'repaid' | 'secondary' | 'primary'; border: string } => {
    switch (variant) {
      case 'overdue':
        return {
          bg: colors.overdueTint,
          text: 'overdue',
          border: colors.overdue,
        };
      case 'accent':
        return {
          bg: colors.accentTint,
          text: 'accent',
          border: colors.accent,
        };
      case 'repaid':
        return {
          bg: colors.repaidTint,
          text: 'repaid',
          border: colors.border,
        };
      case 'pending':
        return {
          bg: colors.surfaceMuted,
          text: 'secondary',
          border: colors.border,
        };
      case 'neutral':
      default:
        return {
          bg: colors.surfaceMuted,
          text: 'secondary',
          border: colors.border,
        };
    }
  };

  const { bg, text, border } = getVariantStyles();

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: radius.pill,
          paddingHorizontal: isSmall ? spacing.sm : spacing.md,
          paddingVertical: isSmall ? 2 : spacing.xs,
        },
        style,
      ]}
    >
      {icon ? <View style={{ marginRight: spacing.xs }}>{icon}</View> : null}
      <Text
        variant={isSmall ? 'label' : 'caption'}
        color={text}
        style={{ fontWeight: '600' }}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
