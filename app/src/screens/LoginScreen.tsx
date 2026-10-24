import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ArrowRight, Smartphone, ShieldCheck, Sun, Moon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { Text, Button, Card } from '../components/ui';

export const LoginScreen: React.FC = () => {
  const { requestOtp, verifyOtp } = useAuth();
  const { colors, spacing, radius, typography, isDark, toggleTheme } = useTheme();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const phoneInputRef = useRef<any>(null);
  const hiddenOtpInputRef = useRef<any>(null);

  // Shake animation for OTP error
  const shakeX = useSharedValue(0);

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // safe fallback
    }
  };

  const animatedShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handlePhoneSubmit = async () => {
    Keyboard.dismiss();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length !== 10) {
      setErrorMessage('Enter a valid 10-digit mobile number');
      triggerShake();
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const fullPhone = `+91${cleanDigits}`;
    const result = await requestOtp(fullPhone);

    setLoading(false);
    if (result.success) {
      setStep('OTP');
      setCountdown(30);
      setOtp('');
      setTimeout(() => hiddenOtpInputRef.current?.focus(), 250);
    } else {
      setErrorMessage(result.error || 'Failed to send OTP. Please try again.');
      triggerShake();
      if (result.retryAfter) {
        setCountdown(result.retryAfter);
      }
    }
  };

  const handleOtpSubmit = async () => {
    Keyboard.dismiss();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMessage('Enter the complete 6-digit passcode');
      triggerShake();
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const fullPhone = `+91${phone.replace(/\D/g, '')}`;
    const result = await verifyOtp(fullPhone, cleanOtp);

    setLoading(false);
    if (!result.success) {
      setErrorMessage(result.error || 'Invalid or expired passcode');
      triggerShake();
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // safe fallback
      }
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    setErrorMessage(null);

    const fullPhone = `+91${phone.replace(/\D/g, '')}`;
    const result = await requestOtp(fullPhone);

    setLoading(false);
    if (result.success) {
      setCountdown(30);
      setOtp('');
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // safe fallback
      }
    } else {
      setErrorMessage(result.error || 'Failed to resend passcode');
      triggerShake();
      if (result.retryAfter) {
        setCountdown(result.retryAfter);
      }
    }
  };

  const handleChangeNumber = () => {
    setStep('PHONE');
    setOtp('');
    setErrorMessage(null);
    setTimeout(() => phoneInputRef.current?.focus(), 150);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.contentContainer, { padding: spacing.xl }]}>
            {/* Top Bar with Brand & Theme Toggle */}
            <View style={styles.topRow}>
              <View style={styles.brandBadge}>
                <View
                  style={[
                    styles.brandDot,
                    { backgroundColor: colors.accent, marginRight: spacing.sm },
                  ]}
                />
                <Text variant="title2" style={{ fontWeight: '700' }}>
                  MiniLedger
                </Text>
              </View>

              <Pressable
                onPress={toggleTheme}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Toggle Theme"
                style={[
                  styles.themeToggle,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    borderRadius: radius.pill,
                  },
                ]}
              >
                {isDark ? (
                  <Sun size={18} color={colors.textPrimary} />
                ) : (
                  <Moon size={18} color={colors.textPrimary} />
                )}
              </Pressable>
            </View>

            {/* Main Stage */}
            <View style={styles.centerStage}>
              {step === 'PHONE' ? (
                <View>
                  <Text variant="title" style={{ marginBottom: spacing.xs }}>
                    Who owes you?
                  </Text>
                  <Text
                    variant="body"
                    color="secondary"
                    style={{ marginBottom: spacing.xxl }}
                  >
                    Enter your phone to sign in or get started.
                  </Text>

                  {/* Phone input with fixed +91 chip */}
                  <View style={{ marginBottom: spacing.lg }}>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={{ marginBottom: spacing.xs, fontWeight: '500' }}
                    >
                      Phone Number
                    </Text>

                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: colors.surface,
                          borderColor: errorMessage ? colors.overdue : colors.border,
                          borderRadius: radius.sm,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.countryChip,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderRightColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          variant="bodyMedium"
                          style={{ fontWeight: '600' }}
                          tabularNums
                        >
                          +91
                        </Text>
                      </View>

                      <TextInput
                        ref={phoneInputRef}
                        style={[
                          typography.body,
                          styles.phoneInput,
                          { color: colors.textPrimary },
                        ]}
                        placeholder="98765 43210"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="number-pad"
                        maxLength={10}
                        value={phone}
                        onChangeText={(val) => {
                          setPhone(val.replace(/\D/g, ''));
                          if (errorMessage) setErrorMessage(null);
                        }}
                        editable={!loading}
                        autoFocus
                      />
                    </View>

                    {errorMessage ? (
                      <Text
                        variant="caption"
                        color="overdue"
                        style={{ marginTop: spacing.xs }}
                      >
                        {errorMessage}
                      </Text>
                    ) : (
                      <Text
                        variant="caption"
                        color="tertiary"
                        style={{ marginTop: spacing.xs }}
                      >
                        Mock OTP is printed to the backend terminal log.
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <Animated.View style={animatedShakeStyle}>
                  <Text variant="title" style={{ marginBottom: spacing.xs }}>
                    Enter Passcode
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: spacing.xxl,
                    }}
                  >
                    <Text variant="body" color="secondary">
                      Sent to +91 {phone} •{' '}
                    </Text>
                    <Pressable onPress={handleChangeNumber} hitSlop={6}>
                      <Text
                        variant="body"
                        color="accent"
                        style={{ fontWeight: '600' }}
                      >
                        Edit
                      </Text>
                    </Pressable>
                  </View>

                  {/* 6 Individual OTP Boxes with Auto-Advance & Paste */}
                  <View style={{ marginBottom: spacing.lg }}>
                    <Text
                      variant="caption"
                      color="secondary"
                      style={{ marginBottom: spacing.md, fontWeight: '500' }}
                    >
                      6-Digit Code
                    </Text>

                    <Pressable
                      onPress={() => hiddenOtpInputRef.current?.focus()}
                      style={styles.otpBoxesRow}
                    >
                      {[0, 1, 2, 3, 4, 5].map((index) => {
                        const digit = otp[index] || '';
                        const isCurrent = otp.length === index;

                        return (
                          <View
                            key={index}
                            style={[
                              styles.otpBox,
                              {
                                backgroundColor: colors.surface,
                                borderColor: errorMessage
                                  ? colors.overdue
                                  : isCurrent
                                  ? colors.accent
                                  : colors.border,
                                borderRadius: radius.sm,
                              },
                            ]}
                          >
                            <Text
                              variant="title"
                              tabularNums
                              style={{ fontWeight: '700' }}
                            >
                              {digit}
                            </Text>
                          </View>
                        );
                      })}
                    </Pressable>

                    {/* Hidden input capturing typing and paste events */}
                    <TextInput
                      ref={hiddenOtpInputRef}
                      style={styles.hiddenInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={(val) => {
                        const clean = val.replace(/\D/g, '');
                        setOtp(clean);
                        if (errorMessage) setErrorMessage(null);
                        if (clean.length === 6) {
                          Keyboard.dismiss();
                        }
                      }}
                      editable={!loading}
                    />

                    {errorMessage ? (
                      <Text
                        variant="caption"
                        color="overdue"
                        style={{ marginTop: spacing.sm, textAlign: 'center' }}
                      >
                        {errorMessage}
                      </Text>
                    ) : null}

                    {/* Resend microcopy */}
                    <View style={styles.resendContainer}>
                      {countdown > 0 ? (
                        <Text variant="caption" color="tertiary" tabularNums>
                          Resend in {countdown}s
                        </Text>
                      ) : (
                        <Pressable onPress={handleResendOtp} disabled={loading}>
                          <Text
                            variant="caption"
                            color="accent"
                            style={{ fontWeight: '600' }}
                          >
                            Didn't get code? Resend
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Animated.View>
              )}
            </View>

            {/* Bottom Section: Primary Action Button Pinned */}
            <View style={styles.bottomSection}>
              {step === 'PHONE' ? (
                <Button
                  label="Continue"
                  onPress={handlePhoneSubmit}
                  loading={loading}
                  disabled={phone.length !== 10 || loading}
                  icon={<ArrowRight size={18} color="#FFFFFF" />}
                />
              ) : (
                <Button
                  label="Verify & Continue"
                  onPress={handleOtpSubmit}
                  loading={loading}
                  disabled={otp.length !== 6 || loading}
                  icon={<ShieldCheck size={18} color="#FFFFFF" />}
                />
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  themeToggle: {
    width: 38,
    height: 38,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerStage: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    height: 52,
    overflow: 'hidden',
  },
  countryChip: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    height: '100%',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 54,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  bottomSection: {
    paddingTop: 16,
  },
});
