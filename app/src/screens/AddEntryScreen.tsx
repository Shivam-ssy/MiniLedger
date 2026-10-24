import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import {
  X,
  Calendar,
  Camera,
  Image as ImageIcon,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { api, getApiErrorMessage } from '../services/api.service';
import { formatDisplayDate } from '../utils/format';
import { useTheme } from '../theme';
import { Text, Button, Card, Input } from '../components/ui';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddEntry'>;

interface ReceiptAsset {
  uri: string;
  name: string;
  type: string;
}

export const AddEntryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, spacing, radius, typography } = useTheme();

  const [friendName, setFriendName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Default to 1 week from today
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [receipt, setReceipt] = useState<ReceiptAsset | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    friendName?: string;
    amount?: string;
    dueDate?: string;
    general?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: { friendName?: string; amount?: string; dueDate?: string } = {};

    // Friend Name
    const trimmedName = friendName.trim();
    if (!trimmedName) {
      newErrors.friendName = 'Friend name is required';
    } else if (trimmedName.length > 100) {
      newErrors.friendName = 'Friend name cannot exceed 100 characters';
    }

    // Amount
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Enter a valid positive amount';
    } else if (parsedAmount > 10000000) {
      newErrors.amount = 'Amount cannot exceed ₹1,00,00,000';
    } else {
      const parts = amount.split('.');
      if (parts.length > 1 && (parts[1]?.length ?? 0) > 2) {
        newErrors.amount = 'Max 2 decimal places';
      }
    }

    // Due Date (disallow dates before today)
    const now = new Date();
    const todayMidnight = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const dueMidnight = new Date(
      Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()),
    );
    if (dueMidnight.getTime() < todayMidnight.getTime()) {
      newErrors.dueDate = 'Due date cannot be before today';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid =
    friendName.trim().length > 0 &&
    Boolean(amount) &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) > 0;

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date): void => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
      if (errors.dueDate) {
        setErrors((prev) => ({ ...prev, dueDate: undefined }));
      }
    }
  };

  const setQuickDate = (days: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fallback
    }
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d);
    if (errors.dueDate) {
      setErrors((prev) => ({ ...prev, dueDate: undefined }));
    }
  };

  const handlePickFromGallery = async (): Promise<void> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setErrors((prev) => ({
          ...prev,
          general: 'Allow gallery access to select a receipt photo',
        }));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const filename = uri.split('/').pop() || 'receipt.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        setReceipt({
          uri,
          name: filename,
          type: mimeType,
        });
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // Fallback
        }
      }
    } catch {
      setErrors((prev) => ({ ...prev, general: 'Failed to pick image' }));
    }
  };

  const handleTakePhoto = async (): Promise<void> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setErrors((prev) => ({
          ...prev,
          general: 'Allow camera access to capture a receipt',
        }));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const filename = uri.split('/').pop() || 'receipt.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

        setReceipt({
          uri,
          name: filename,
          type: mimeType,
        });
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {
          // Fallback
        }
      }
    } catch {
      setErrors((prev) => ({ ...prev, general: 'Failed to take photo' }));
    }
  };

  const handleUploadReceipt = async (loanId: string, asset: ReceiptAsset): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('receipt', {
        uri: asset.uri,
        name: asset.name,
        type: asset.type,
      } as any);

      await api.post(`/loans/${loanId}/receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrors({});

    const formattedDate = dueDate.toISOString().split('T')[0]!;
    let createdLoanId: string | null = null;

    try {
      const res = await api.post<{ loan: { id: string } }>('/loans', {
        friendName: friendName.trim(),
        amount: parseFloat(amount),
        dueDate: formattedDate,
      });
      createdLoanId = res.data.loan.id;

      if (receipt && createdLoanId) {
        await handleUploadReceipt(createdLoanId, receipt);
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Fallback
      }

      setSubmitting(false);
      navigation.goBack();
    } catch (err) {
      setSubmitting(false);
      const msg = getApiErrorMessage(err);
      setErrors({ general: msg });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* Modal Handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handleBar, { backgroundColor: colors.borderStrong }]} />
        </View>

        {/* Header */}
        <View style={[styles.headerRow, { paddingHorizontal: spacing.xl }]}>
          <Text variant="title2" style={{ fontWeight: '700' }}>
            New Loan
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[
              styles.closeBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                borderRadius: radius.pill,
              },
            ]}
          >
            <X size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {errors.general ? (
            <Card
              variant="overdue"
              style={[styles.errorCard, { marginBottom: spacing.md, padding: spacing.md }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AlertCircle size={16} color={colors.overdue} style={{ marginRight: 8 }} />
                <Text variant="caption" color="overdue" style={{ flex: 1 }}>
                  {errors.general}
                </Text>
              </View>
            </Card>
          ) : null}

          {/* Focal Point: Large Hero Amount Input */}
          <View
            style={[
              styles.heroAmountBox,
              {
                backgroundColor: colors.surface,
                borderColor: errors.amount ? colors.overdue : colors.border,
                borderRadius: radius.lg,
                padding: spacing.xl,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <Text
              variant="caption"
              color="secondary"
              style={{ fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}
            >
              Amount Lent
            </Text>

            <View style={styles.amountInputRow}>
              <Text
                variant="display"
                color={errors.amount ? 'overdue' : 'accent'}
                style={{ marginRight: 6, fontWeight: '700' }}
              >
                ₹
              </Text>

              <TextInput
                style={[
                  typography.display,
                  styles.amountInput,
                  { color: colors.textPrimary },
                ]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={(val) => {
                  setAmount(val);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                autoFocus
              />
            </View>

            {errors.amount ? (
              <Text variant="caption" color="overdue" style={{ marginTop: 4 }}>
                {errors.amount}
              </Text>
            ) : null}
          </View>

          {/* Friend Name Input */}
          <View style={{ marginBottom: spacing.lg }}>
            <Input
              label="Who did you lend to?"
              placeholder="e.g. Rahul Sharma"
              value={friendName}
              onChangeText={(val) => {
                setFriendName(val);
                if (errors.friendName) setErrors((prev) => ({ ...prev, friendName: undefined }));
              }}
              error={errors.friendName}
              autoCapitalize="words"
            />
          </View>

          {/* Due Date Row with Quick-Pick Chips */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text
              variant="caption"
              color="secondary"
              style={{ marginBottom: spacing.xs, fontWeight: '500' }}
            >
              Repayment Due Date
            </Text>

            {/* Quick-Pick Date Chips */}
            <View style={styles.chipsRow}>
              {[
                { label: '1 Week', days: 7 },
                { label: '2 Weeks', days: 14 },
                { label: '1 Month', days: 30 },
              ].map((chip) => (
                <Pressable
                  key={chip.label}
                  onPress={() => setQuickDate(chip.days)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                      borderRadius: radius.pill,
                    },
                  ]}
                >
                  <Text variant="caption" color="secondary" style={{ fontWeight: '500' }}>
                    {chip.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Tappable Due Date Tile */}
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.datePickerRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: errors.dueDate ? colors.overdue : colors.border,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.md,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Calendar size={18} color={colors.accent} style={{ marginRight: 10 }} />
                <Text variant="bodyMedium" tabularNums>
                  {formatDisplayDate(dueDate.toISOString().split('T')[0]!)}
                </Text>
              </View>

              <Text variant="caption" color="accent" style={{ fontWeight: '600' }}>
                Change
              </Text>
            </Pressable>

            {errors.dueDate ? (
              <Text variant="caption" color="overdue" style={{ marginTop: spacing.xs }}>
                {errors.dueDate}
              </Text>
            ) : null}

            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Receipt Attachment Tile */}
          <View style={{ marginBottom: spacing.xxl }}>
            <Text
              variant="caption"
              color="secondary"
              style={{ marginBottom: spacing.xs, fontWeight: '500' }}
            >
              Receipt Attachment (Optional)
            </Text>

            {receipt ? (
              <Card style={[styles.receiptPreviewCard, { padding: spacing.md }]}>
                <Image source={{ uri: receipt.uri }} style={styles.receiptThumbnail} />
                <View style={styles.receiptInfo}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {receipt.name}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    Attached receipt
                  </Text>
                </View>

                <Pressable
                  onPress={() => setReceipt(null)}
                  hitSlop={8}
                  style={[styles.removeReceiptBtn, { backgroundColor: colors.overdueTint }]}
                  accessibilityRole="button"
                  accessibilityLabel="Remove attached receipt"
                >
                  <Trash2 size={16} color={colors.overdue} />
                </Pressable>
              </Card>
            ) : (
              <View style={styles.attachmentOptionsRow}>
                <Pressable
                  onPress={handlePickFromGallery}
                  style={[
                    styles.attachTile,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <ImageIcon size={18} color={colors.textSecondary} style={{ marginBottom: 4 }} />
                  <Text variant="caption" color="secondary">
                    Gallery
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleTakePhoto}
                  style={[
                    styles.attachTile,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <Camera size={18} color={colors.textSecondary} style={{ marginBottom: 4 }} />
                  <Text variant="caption" color="secondary">
                    Camera
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <Button
            label="Save Loan Entry"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!isFormValid || submitting}
            icon={<Check size={18} color="#FFFFFF" />}
            style={{ marginBottom: spacing.xxl }}
          />
        </ScrollView>
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
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  errorCard: {
    borderWidth: 1,
  },
  heroAmountBox: {
    borderWidth: 1,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
  },
  receiptPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  receiptInfo: {
    flex: 1,
    marginLeft: 12,
  },
  removeReceiptBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  attachTile: {
    flex: 1,
    height: 60,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
