import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  StatusBar,
  Modal,
  Image,
  SectionList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  Paperclip,
  Check,
  AlertCircle,
  Clock,
  CheckCircle2,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { Loan, Summary } from '../types/loan';
import { api, getApiErrorMessage, getBaseUrl } from '../services/api.service';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import {
  Text,
  Button,
  Card,
  Badge,
  Amount,
  Avatar,
  Skeleton,
  EmptyState,
  Snackbar,
} from '../components/ui';
import { formatRelativeDueDate } from '../utils/format';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface SectionData {
  title: string;
  data: Loan[];
  badgeVariant?: 'overdue' | 'pending' | 'repaid';
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Status Filter: 'ALL' | 'PENDING' | 'OVERDUE' | 'REPAID'
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'REPAID'>('ALL');

  // Preview Receipt Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Undo Snackbar State
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    undoData?: { loan: Loan; previousLoans: Loan[]; previousSummary: Summary | null };
  }>({
    visible: false,
    message: '',
  });

  const isMounted = useRef<boolean>(true);
  const pendingRepayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSummary = async (): Promise<void> => {
    try {
      const res = await api.get<Summary>('/summary');
      if (isMounted.current) {
        setSummary(res.data);
      }
    } catch {
      // Ignored
    }
  };

  const fetchLoans = async (
    targetPage = 1,
    filter = statusFilter,
    append = false,
  ): Promise<void> => {
    try {
      let url = `/loans?page=${targetPage}&limit=25`;
      if (filter === 'PENDING') {
        url += '&status=PENDING';
      } else if (filter === 'REPAID') {
        url += '&status=REPAID';
      } else if (filter === 'OVERDUE') {
        url += '&overdue=true';
      }

      const res = await api.get<{
        loans: Loan[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(url);

      if (isMounted.current) {
        if (append) {
          setLoans((prev) => [...prev, ...res.data.loans]);
        } else {
          setLoans(res.data.loans);
        }
        setPage(res.data.pagination.page);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch {
      // Ignored
    }
  };

  const loadData = async (isPullToRefresh = false): Promise<void> => {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    await Promise.all([fetchSummary(), fetchLoans(1, statusFilter, false)]);

    if (isMounted.current) {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      loadData(false);
      return () => {
        isMounted.current = false;
      };
    }, [statusFilter]),
  );

  const handleFilterChange = (filter: 'ALL' | 'PENDING' | 'OVERDUE' | 'REPAID') => {
    if (filter === statusFilter) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fallback
    }
    setStatusFilter(filter);
    setLoading(true);
    fetchLoans(1, filter, false).finally(() => {
      if (isMounted.current) setLoading(false);
    });
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchLoans(page + 1, statusFilter, true).finally(() => {
      if (isMounted.current) setLoadingMore(false);
    });
  };

  // Optimistic Repay with Undo Snackbar
  const handleOptimisticRepay = (loan: Loan) => {
    if (loan.status === 'REPAID') return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Fallback
    }

    const previousLoans = [...loans];
    const previousSummary = summary ? { ...summary } : null;

    // Optimistically update local state
    setLoans((prev) =>
      prev.map((item) =>
        item.id === loan.id
          ? {
              ...item,
              status: 'REPAID',
              repaidAt: new Date().toISOString(),
              isOverdue: false,
            }
          : item,
      ),
    );

    if (summary) {
      setSummary({
        ...summary,
        outstanding: Math.max(0, summary.outstanding - loan.amount),
        totalRepaid: summary.totalRepaid + loan.amount,
        overdueAmount: loan.isOverdue
          ? Math.max(0, summary.overdueAmount - loan.amount)
          : summary.overdueAmount,
      });
    }

    // Show undo snackbar
    setSnackbar({
      visible: true,
      message: `Marked ${loan.friendName}'s loan as repaid`,
      undoData: { loan, previousLoans, previousSummary },
    });

    // Schedule background API commit
    if (pendingRepayTimer.current) {
      clearTimeout(pendingRepayTimer.current);
    }

    pendingRepayTimer.current = setTimeout(async () => {
      try {
        await api.patch(`/loans/${loan.id}/repay`);
      } catch {
        // Revert on failure
        if (isMounted.current) {
          setLoans(previousLoans);
          setSummary(previousSummary);
          setSnackbar({
            visible: true,
            message: 'Failed to record repayment. Reverted.',
          });
        }
      }
    }, 4000);
  };

  const handleUndoRepay = () => {
    if (pendingRepayTimer.current) {
      clearTimeout(pendingRepayTimer.current);
      pendingRepayTimer.current = null;
    }

    if (snackbar.undoData) {
      setLoans(snackbar.undoData.previousLoans);
      setSummary(snackbar.undoData.previousSummary);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Fallback
      }
    }

    setSnackbar({ visible: false, message: '' });
  };

  // Group loans into Sections (Overdue, Upcoming, Settled)
  const sections = useMemo<SectionData[]>(() => {
    const overdueList: Loan[] = [];
    const upcomingList: Loan[] = [];
    const repaidList: Loan[] = [];

    loans.forEach((item) => {
      if (item.status === 'REPAID') {
        repaidList.push(item);
      } else if (item.isOverdue) {
        overdueList.push(item);
      } else {
        upcomingList.push(item);
      }
    });

    const result: SectionData[] = [];

    if (statusFilter === 'ALL' || statusFilter === 'OVERDUE') {
      if (overdueList.length > 0) {
        result.push({
          title: 'Overdue',
          data: overdueList,
          badgeVariant: 'overdue',
        });
      }
    }

    if (statusFilter === 'ALL' || statusFilter === 'PENDING') {
      if (upcomingList.length > 0) {
        result.push({
          title: 'Upcoming',
          data: upcomingList,
          badgeVariant: 'pending',
        });
      }
    }

    if (statusFilter === 'ALL' || statusFilter === 'REPAID') {
      if (repaidList.length > 0) {
        result.push({
          title: 'Settled',
          data: repaidList,
          badgeVariant: 'repaid',
        });
      }
    }

    return result;
  }, [loans, statusFilter]);

  // Swipe Action Renderer
  const renderLeftActions = (loan: Loan) => {
    if (loan.status === 'REPAID') return null;

    return (
      <View
        style={[
          styles.swipeActionContainer,
          { backgroundColor: colors.accent, borderRadius: radius.sm },
        ]}
      >
        <Check size={22} color={colors.white} />
        <Text
          variant="caption"
          color="white"
          style={{ fontWeight: '700', marginLeft: spacing.xs }}
        >
          Repaid
        </Text>
      </View>
    );
  };

  const renderLoanItem = ({ item }: { item: Loan }) => {
    const isRepaid = item.status === 'REPAID';
    const isOverdue = item.isOverdue && !isRepaid;

    const rowContent = (
      <Card
        variant={isOverdue ? 'overdue' : 'default'}
        style={[
          styles.loanCard,
          isRepaid && { opacity: 0.65 },
          isOverdue && { borderLeftWidth: 4, borderLeftColor: colors.overdue },
        ]}
      >
        <View style={styles.cardInner}>
          <Avatar name={item.friendName} size="md" />

          <View style={styles.cardCenter}>
            <View style={styles.nameRow}>
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={[styles.friendName, isRepaid && styles.strikethroughName]}
              >
                {item.friendName}
              </Text>

              {item.receiptUrl ? (
                <Pressable
                  onPress={() => setPreviewImage(item.receiptUrl)}
                  hitSlop={8}
                  style={styles.receiptIcon}
                  accessibilityLabel="View attached receipt"
                >
                  <Paperclip size={14} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.metaRow}>
              {isOverdue ? (
                <AlertCircle size={13} color={colors.overdue} style={{ marginRight: 4 }} />
              ) : isRepaid ? (
                <CheckCircle2 size={13} color={colors.repaid} style={{ marginRight: 4 }} />
              ) : (
                <Clock size={13} color={colors.textTertiary} style={{ marginRight: 4 }} />
              )}
              <Text
                variant="caption"
                color={isOverdue ? 'overdue' : isRepaid ? 'repaid' : 'tertiary'}
              >
                {formatRelativeDueDate(item.dueDate, item.status, item.repaidAt)}
              </Text>
            </View>
          </View>

          <View style={styles.cardRight}>
            <Amount
              value={item.amount}
              variant="title2"
              color={isOverdue ? 'overdue' : isRepaid ? 'repaid' : 'primary'}
            />

            {!isRepaid ? (
              <Pressable
                onPress={() => handleOptimisticRepay(item)}
                hitSlop={6}
                style={[
                  styles.quickRepayPill,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    borderRadius: radius.pill,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Mark ${item.friendName}'s loan as repaid`}
              >
                <Check size={12} color={colors.accent} style={{ marginRight: 3 }} />
                <Text variant="label" color="accent">
                  Repay
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Card>
    );

    if (isRepaid) {
      return <View style={styles.itemWrapper}>{rowContent}</View>;
    }

    return (
      <View style={styles.itemWrapper}>
        <ReanimatedSwipeable
          renderLeftActions={() => renderLeftActions(item)}
          onSwipeableWillOpen={() => handleOptimisticRepay(item)}
          friction={2}
          overshootFriction={8}
        >
          {rowContent}
        </ReanimatedSwipeable>
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title, data } }: { section: SectionData }) => (
    <View style={[styles.sectionHeaderRow, { backgroundColor: colors.background }]}>
      <Text variant="title2" style={{ fontWeight: '600' }}>
        {title}
      </Text>
      <Text variant="caption" color="tertiary" tabularNums>
        {data.length}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Navigation & Profile Bar */}
      <View style={[styles.topBar, { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm }]}>
        <View>
          <Text variant="caption" color="tertiary" style={{ fontWeight: '500' }}>
            Personal Ledger
          </Text>
          <Text variant="title" style={{ fontWeight: '700' }}>
            {user?.phone ? user.phone : 'MiniLedger'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={toggleTheme}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Toggle Dark Mode"
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                borderRadius: radius.pill,
              },
            ]}
          >
            {isDark ? (
              <Sun size={17} color={colors.textPrimary} />
            ) : (
              <Moon size={17} color={colors.textPrimary} />
            )}
          </Pressable>

          <Pressable
            onPress={logout}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                borderRadius: radius.pill,
                marginLeft: spacing.sm,
              },
            ]}
          >
            <LogOut size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={loading ? [] : sections}
        keyExtractor={(item) => item.id}
        renderItem={renderLoanItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: spacing.xl, paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            {/* Hero Summary Card */}
            {loading && !summary ? (
              <Card style={{ padding: spacing.xl, marginBottom: spacing.lg }}>
                <Skeleton width="40%" height={16} style={{ marginBottom: spacing.sm }} />
                <Skeleton width="65%" height={38} style={{ marginBottom: spacing.lg }} />
                <View style={styles.summaryRow}>
                  <Skeleton width="30%" height={24} />
                  <Skeleton width="30%" height={24} />
                  <Skeleton width="30%" height={24} />
                </View>
              </Card>
            ) : (
              <Card
                radiusSize="lg"
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
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
                  Total Outstanding
                </Text>

                <Amount
                  value={summary?.outstanding ?? 0}
                  variant="display"
                  color="primary"
                  style={{ marginVertical: spacing.xs }}
                />

                {/* Compact Metrics Row */}
                <View
                  style={[
                    styles.summaryMetricsRow,
                    { borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.sm },
                  ]}
                >
                  <View style={styles.metricItem}>
                    <Text variant="caption" color="tertiary">
                      Total Lent
                    </Text>
                    <Amount
                      value={summary?.totalLent ?? 0}
                      variant="bodyMedium"
                      color="primary"
                      style={{ fontWeight: '600' }}
                    />
                  </View>

                  <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.metricItem}>
                    <Text variant="caption" color="tertiary">
                      Repaid
                    </Text>
                    <Amount
                      value={summary?.totalRepaid ?? 0}
                      variant="bodyMedium"
                      color="repaid"
                      style={{ fontWeight: '600' }}
                    />
                  </View>

                  <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.metricItem}>
                    <Text variant="caption" color="tertiary">
                      Overdue
                    </Text>
                    <Amount
                      value={summary?.overdueAmount ?? 0}
                      variant="bodyMedium"
                      color={(summary?.overdueAmount ?? 0) > 0 ? 'overdue' : 'primary'}
                      style={{ fontWeight: '600' }}
                    />
                  </View>
                </View>
              </Card>
            )}

            {/* Filter Chips */}
            <View style={styles.filterRow}>
              {(['ALL', 'PENDING', 'OVERDUE', 'REPAID'] as const).map((filter) => {
                const isActive = statusFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => handleFilterChange(filter)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? colors.accent : colors.surfaceMuted,
                        borderColor: isActive ? colors.accent : colors.border,
                        borderRadius: radius.pill,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: isActive ? colors.white : colors.textSecondary,
                        fontWeight: isActive ? '600' : '400',
                      }}
                    >
                      {filter === 'ALL'
                        ? 'All'
                        : filter === 'PENDING'
                        ? 'Pending'
                        : filter === 'OVERDUE'
                        ? 'Overdue'
                        : 'Settled'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: spacing.md }}>
              <Skeleton height={72} borderRadius={radius.sm} />
              <Skeleton height={72} borderRadius={radius.sm} />
              <Skeleton height={72} borderRadius={radius.sm} />
            </View>
          ) : (
            <EmptyState
              icon={<CheckCircle2 size={32} color={colors.accent} />}
              title="All settled up"
              description="No loans match this filter. Ready to record a new loan to a friend?"
              actionLabel="Add Loan"
              onAction={() => navigation.navigate('AddEntry')}
            />
          )
        }
      />

      {/* Floating Action Button (+) */}
      <Pressable
        onPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            // Fallback
          }
          navigation.navigate('AddEntry');
        }}
        accessibilityRole="button"
        accessibilityLabel="Add loan entry"
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent,
            borderRadius: radius.pill,
            shadowColor: colors.accent,
          },
        ]}
      >
        <Plus size={24} color={colors.white} strokeWidth={2.5} />
      </Pressable>

      {/* Undo Snackbar */}
      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        actionLabel={snackbar.undoData ? 'Undo' : undefined}
        onAction={handleUndoRepay}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
      />

      {/* Full-Screen Receipt Preview Modal */}
      <Modal
        visible={Boolean(previewImage)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="title2" color="white">
                Receipt Attachment
              </Text>
              <Pressable
                onPress={() => setPreviewImage(null)}
                hitSlop={12}
                style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              >
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            {previewImage ? (
              <Image
                source={{
                  uri: previewImage.startsWith('http')
                    ? previewImage
                    : `${getBaseUrl()}${previewImage}`,
                }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  heroCard: {
    borderWidth: 1,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  metricItem: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  itemWrapper: {
    marginBottom: 8,
  },
  loanCard: {
    padding: 14,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCenter: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendName: {
    fontWeight: '600',
    maxWidth: 160,
  },
  strikethroughName: {
    textDecorationLine: 'line-through',
  },
  receiptIcon: {
    marginLeft: 6,
    padding: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  quickRepayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    marginTop: 4,
  },
  swipeActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: '100%',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    width: '100%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
