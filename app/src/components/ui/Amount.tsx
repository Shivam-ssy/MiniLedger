import React from 'react';
import { TextStyle, StyleProp } from 'react-native';
import { formatIndianCurrency } from '../../utils/format';
import { TypographyVariant } from '../../theme';
import { Text, TextProps } from './Text';

export interface AmountProps {
  value: number;
  variant?: TypographyVariant;
  color?: TextProps['color'];
  showSign?: boolean;
  style?: StyleProp<TextStyle>;
}

export const Amount: React.FC<AmountProps> = ({
  value,
  variant = 'title2',
  color = 'primary',
  showSign = false,
  style,
}) => {
  const formatted = formatIndianCurrency(Math.abs(value));
  const sign = showSign && value > 0 ? '+' : showSign && value < 0 ? '-' : '';

  return (
    <Text
      variant={variant}
      color={color}
      tabularNums
      style={style}
      accessibilityLabel={`Rupees ${formatted}`}
    >
      {sign}
      {formatted}
    </Text>
  );
};
