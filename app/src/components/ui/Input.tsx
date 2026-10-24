import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../theme';
import { Text } from './Text';

export interface InputProps extends RNTextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = React.forwardRef<any, InputProps>(
  ({ label, error, hint, prefix, suffix, containerStyle, onFocus, onBlur, style, ...rest }, ref) => {
    const { colors, spacing, radius, typography } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const hasError = Boolean(error);

    const borderColor = hasError
      ? colors.overdue
      : isFocused
      ? colors.accent
      : colors.border;

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label ? (
          <Text
            variant="caption"
            color={hasError ? 'overdue' : 'secondary'}
            style={[styles.label, { marginBottom: spacing.xs }]}
          >
            {label}
          </Text>
        ) : null}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          {prefix ? <View style={{ marginRight: spacing.sm }}>{prefix}</View> : null}

          <RNTextInput
            ref={ref}
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.accent}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            style={[
              typography.body,
              styles.textInput,
              { color: colors.textPrimary },
              style,
            ]}
            {...rest}
          />

          {suffix ? <View style={{ marginLeft: spacing.sm }}>{suffix}</View> : null}
        </View>

        {error ? (
          <Text
            variant="caption"
            color="overdue"
            style={[styles.helperText, { marginTop: spacing.xs }]}
          >
            {error}
          </Text>
        ) : hint ? (
          <Text
            variant="caption"
            color="tertiary"
            style={[styles.helperText, { marginTop: spacing.xs }]}
          >
            {hint}
          </Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1.5,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
  },
  helperText: {
    paddingHorizontal: 2,
  },
});
