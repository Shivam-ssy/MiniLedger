import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  style,
  accessibilityLabel,
}) => {
  const { colors, spacing, radius } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withTiming(0.97, {
      duration: 120,
      easing: Easing.out(Easing.ease),
    });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics optional on web/unsupported
      }
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Sizing definitions (all >= 44px for accessibility touch targets)
  const sizeStyles: Record<
    'sm' | 'md' | 'lg',
    { height: number; paddingHorizontal: number; fontSize: 'caption' | 'bodyMedium' | 'title2' }
  > = {
    sm: { height: 44, paddingHorizontal: spacing.md, fontSize: 'caption' },
    md: { height: 50, paddingHorizontal: spacing.lg, fontSize: 'bodyMedium' },
    lg: { height: 56, paddingHorizontal: spacing.xl, fontSize: 'bodyMedium' },
  };

  const currentSize = sizeStyles[size];

  // Variant styling
  let backgroundColor = colors.accent;
  let borderColor = 'transparent';
  let textColor: 'white' | 'primary' | 'secondary' | 'overdue' = 'white';

  if (variant === 'primary') {
    backgroundColor = colors.accent;
    textColor = 'white';
  } else if (variant === 'secondary') {
    backgroundColor = colors.surfaceMuted;
    borderColor = colors.border;
    textColor = 'primary';
  } else if (variant === 'ghost') {
    backgroundColor = 'transparent';
    textColor = 'primary';
  } else if (variant === 'danger') {
    backgroundColor = colors.overdueTint;
    borderColor = colors.overdue;
    textColor = 'overdue';
  }

  const isInteractive = !disabled && !loading;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      style={[
        styles.base,
        {
          height: currentSize.height,
          paddingHorizontal: currentSize.paddingHorizontal,
          backgroundColor,
          borderColor,
          borderWidth: borderColor === 'transparent' ? 0 : 1,
          borderRadius: radius.sm,
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled ? 0.45 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.accent}
        />
      ) : (
        <Animated.View style={styles.contentRow}>
          {icon ? <Animated.View style={{ marginRight: spacing.sm }}>{icon}</Animated.View> : null}
          <Text
            variant={currentSize.fontSize}
            color={textColor}
            style={{ fontWeight: '600' }}
          >
            {label}
          </Text>
        </Animated.View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
