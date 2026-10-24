import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from './Text';

export interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

// Deterministic pastel/muted color palette derived from name hash
const AVATAR_PALETTE_LIGHT = [
  { bg: '#EBF4EE', text: '#164E2E' }, // Pine
  { bg: '#EBF1F6', text: '#1E3A5F' }, // Slate Blue
  { bg: '#F7EFE9', text: '#7C3E1D' }, // Terracotta
  { bg: '#F5ECEB', text: '#6D2829' }, // Berry
  { bg: '#EFEFEA', text: '#3E4239' }, // Olive
  { bg: '#F1ECF5', text: '#4C286D' }, // Plum
  { bg: '#F6F2E9', text: '#63481D' }, // Sand
];

const AVATAR_PALETTE_DARK = [
  { bg: '#183324', text: '#6EE7B7' }, // Pine
  { bg: '#19283E', text: '#93C5FD' }, // Slate Blue
  { bg: '#382317', text: '#FDBA74' }, // Terracotta
  { bg: '#331D1F', text: '#FCA5A5' }, // Berry
  { bg: '#252922', text: '#D9F99D' }, // Olive
  { bg: '#2B1C38', text: '#D8B4FE' }, // Plum
  { bg: '#2E2719', text: '#FDE047' }, // Sand
];

function getHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const first = parts[0];
    return first ? first.substring(0, 2).toUpperCase() : '?';
  }
  const first = parts[0];
  const second = parts[1];
  return ((first ? first[0] : '') + (second ? second[0] : '')).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', style }) => {
  const { radius, isDark } = useTheme();

  const palette = isDark ? AVATAR_PALETTE_DARK : AVATAR_PALETTE_LIGHT;
  const colorIndex = getHash(name || 'Unknown') % palette.length;
  const chosenColor = palette[colorIndex] || palette[0]!;

  const dimensions = {
    sm: { size: 36, variant: 'caption' as const },
    md: { size: 44, variant: 'bodyMedium' as const },
    lg: { size: 54, variant: 'title2' as const },
  }[size];

  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.size,
          height: dimensions.size,
          borderRadius: radius.sm,
          backgroundColor: chosenColor.bg,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`Avatar for ${name}`}
    >
      <Text
        variant={dimensions.variant}
        style={{ color: chosenColor.text, fontWeight: '600' }}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
