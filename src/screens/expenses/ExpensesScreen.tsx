import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarDays, CloudUpload, Send, Trash2, User, Users, Wallet, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DonutChart, type DonutSegment } from '../../components/charts/DonutChart';
import { ReceiptListItem } from '../../components/cards/ReceiptListItem';
import { ReceiptQuickActions } from '../../components/modals/ReceiptQuickActions';
import { FadeInView } from '../../components/ui/FadeInView';
import { ScreenPlaceholder } from '../../components/ui/ScreenPlaceholder';
import type { AppStackParamList } from '../../navigation/types';
import {
  fetchMonthlyCategoryBreakdown,
  type CategoryBreakdownEntry,
} from '../../services/analytics/categoryBreakdown';
import { getQueue, removeFromQueue, type QueuedScan } from '../../services/offlineQueue/offlineQueue';
import { avatarUrl } from '../../services/profile/avatarService';
import { submitScan } from '../../services/receipts/backgroundScan';
import { deleteReceipt } from '../../services/receipts/receiptsService';
import { useAuthStore } from '../../store/authStore';
import { useReceiptsStore } from '../../store/receiptsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import { colors, getCategoryColor } from '../../theme/colors';
import type { ReceiptRecord } from '../../types/receiptRecord';
import { themedStyles } from '../../theme/themedStyles';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export function ExpensesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const userId = useAuthStore((state) => state.session?.user.id);
  const receipts = useReceiptsStore((state) => state.receipts);
  const ownerProfiles = useReceiptsStore((state) => state.ownerProfiles);
  const isLoading = useReceiptsStore((state) => state.isLoading);
  const fetchReceipts = useReceiptsStore((state) => state.fetch);
  const settings = useSettingsStore((state) => state.settings);
  const showToast = useToastStore((state) => state.show);

  const [quickActionsReceipt, setQuickActionsReceipt] = useState<ReceiptRecord | null>(null);
  const [pendingScans, setPendingScans] = useState<QueuedScan[]>([]);
  const [queueVisible, setQueueVisible] = useState(false);
  const [sendingQueueId, setSendingQueueId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownEntry[]>([]);
  const [categoryCurrency, setCategoryCurrency] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  // 3D-переворот карточки: спереди диаграмма, сзади мини-календарь.
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  function loadCategories() {
    if (!userId) return;
    // Диаграмма должна совпадать со списком чеков ниже: без фильтра — вместе
    // с семьёй, с «только я» — как и список, только свои.
    fetchMonthlyCategoryBreakdown(userId, new Date(), !showOnlyMine).then(({ entries, currency }) => {
      setCategories(entries);
      setCategoryCurrency(currency);
    });
  }

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchReceipts(userId);
        loadCategories();
      }
      getQueue().then(setPendingScans);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, fetchReceipts]),
  );

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnlyMine]);

  function rootNav() {
    return navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  }

  function toggleFlip() {
    const next = !flipped;
    setFlipped(next);
    Animated.spring(flipAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 14,
    }).start();
  }

  async function sendQueuedScan(scan: QueuedScan) {
    if (!userId || sendingQueueId) return;
    setSendingQueueId(scan.id);
    const { error } = await submitScan(userId, scan.imageBase64, settings?.currency ?? 'CZK');
    setSendingQueueId(null);
    if (error) {
      Alert.alert('Пока не получилось', 'Попробуйте ещё раз, когда появится сеть.');
      return;
    }
    await removeFromQueue(scan.id);
    const next = await getQueue();
    setPendingScans(next);
    if (next.length === 0) setQueueVisible(false);
    showToast('Чек отправлен — обрабатывается в фоне');
    fetchReceipts(userId);
  }

  async function deleteQueuedScan(scan: QueuedScan) {
    await removeFromQueue(scan.id);
    const next = await getQueue();
    setPendingScans(next);
    if (next.length === 0) setQueueVisible(false);
  }

  function openDetail(receiptId: string) {
    rootNav()?.navigate('ReceiptDetail', { receiptId });
  }

  function handleLongPress(receipt: ReceiptRecord) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuickActionsReceipt(receipt);
  }

  function handleEdit() {
    if (!quickActionsReceipt) return;
    const id = quickActionsReceipt.id;
    setQuickActionsReceipt(null);
    openDetail(id);
  }

  function handleDeleteRequest() {
    if (!quickActionsReceipt) return;
    const receipt = quickActionsReceipt;
    setQuickActionsReceipt(null);
    Alert.alert('Удалить чек?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          const error = await deleteReceipt(receipt.id, receipt.image_path);
          if (error) {
            Alert.alert('Не удалось удалить чек', error);
            return;
          }
          if (userId) fetchReceipts(userId);
        },
      },
    ]);
  }

  const hasFamilyReceipts = receipts.some((r) => r.user_id !== userId);
  const visibleReceipts = showOnlyMine ? receipts.filter((r) => r.user_id === userId) : receipts;
  const myAvatar = avatarUrl(settings?.avatar_path ?? null, settings?.updated_at);

  if (!isLoading && receipts.length === 0 && pendingScans.length === 0) {
    return (
      <ScreenPlaceholder
        icon={Wallet}
        title="Расходы"
        description="Здесь появятся ваши чеки — отсканируйте первый с Главной."
      />
    );
  }

  const monthTotal = categories.reduce((sum, c) => sum + c.total, 0);
  const segments: DonutSegment[] = categories.map((c) => ({
    key: c.categoryName,
    value: c.total,
    color: getCategoryColor(c.categoryName),
  }));
  const chartStyle = settings?.chart_style ?? 'donut';
  const maxCategoryTotal = Math.max(...categories.map((c) => c.total), 1);

  // Мини-календарь текущего месяца для обратной стороны карточки — сумма
  // сразу видна в ячейке, без дополнительного тапа.
  const now = new Date();
  const dailyTotals = new Map<number, number>();
  for (const r of visibleReceipts) {
    const d = r.purchase_date ? new Date(r.purchase_date) : new Date(r.created_at);
    if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;
    const amount = (r.total_amount ?? 0) * (r.exchange_rate ?? 1);
    dailyTotals.set(d.getDate(), (dailyTotals.get(d.getDate()) ?? 0) + amount);
  }
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstWeekday = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7; // Пн=0
  const calendarCells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const frontAnimated = {
    transform: [
      { perspective: 1000 },
      { rotateY: flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
    ],
  };
  const backAnimated = {
    transform: [
      { perspective: 1000 },
      { rotateY: flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) },
    ],
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleReceipts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const foreignOwner = item.user_id !== userId ? ownerProfiles[item.user_id] : null;
          return (
            <FadeInView index={index}>
              <ReceiptListItem
                receipt={item}
                onPress={() => openDetail(item.id)}
                onLongPress={() => handleLongPress(item)}
                ownerAvatarUrl={
                  foreignOwner ? avatarUrl(foreignOwner.avatar_path, foreignOwner.updated_at) : myAvatar
                }
                ownerName={foreignOwner ? foreignOwner.nickname?.trim() || 'Без имени' : null}
              />
            </FadeInView>
          );
        }}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => userId && fetchReceipts(userId)}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Расходы</Text>

            {pendingScans.length > 0 && (
              <Pressable style={styles.queueBanner} onPress={() => setQueueVisible(true)}>
                <CloudUpload color={colors.warning} size={18} />
                <Text style={styles.queueBannerText}>
                  Ожидают отправки: {pendingScans.length}. Нажмите, чтобы посмотреть.
                </Text>
              </Pressable>
            )}

            {segments.length > 0 && (
              <FadeInView index={0}>
                <View style={styles.flipWrap}>
                  {/* Задняя сторона: мини-календарь */}
                  <Animated.View
                    style={[styles.chartCard, styles.cardBack, backAnimated]}
                    pointerEvents={flipped ? 'auto' : 'none'}
                  >
                    <View style={styles.cardCornerRow}>
                      <Text style={styles.calendarTitle}>
                        {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
                      </Text>
                      <Pressable style={styles.cornerButton} onPress={toggleFlip} hitSlop={6}>
                        <X color={colors.accent} size={18} />
                      </Pressable>
                    </View>
                    <View style={styles.weekRow}>
                      {WEEKDAYS.map((day) => (
                        <Text key={day} style={styles.weekday}>
                          {day}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.daysGrid}>
                      {calendarCells.map((day, i) => {
                        const total = day !== null ? dailyTotals.get(day) : undefined;
                        return (
                          <View key={i} style={styles.dayCell}>
                            {day !== null && (
                              <View
                                style={[
                                  styles.dayInner,
                                  total !== undefined && styles.daySpent,
                                  day === now.getDate() && styles.dayToday,
                                ]}
                              >
                                <Text style={[styles.dayText, total !== undefined && styles.dayTextSpent]}>
                                  {day}
                                </Text>
                                {total !== undefined && (
                                  <Text style={styles.daySpentAmount} numberOfLines={1}>
                                    {total.toFixed(0)}
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                    <Pressable onPress={() => rootNav()?.navigate('Calendar')}>
                      <Text style={styles.calendarLink}>Открыть полный календарь</Text>
                    </Pressable>
                  </Animated.View>

                  {/* Передняя сторона: диаграмма */}
                  <Animated.View
                    style={[styles.chartCard, frontAnimated]}
                    pointerEvents={flipped ? 'none' : 'auto'}
                  >
                    <View style={styles.cardCorner}>
                      {hasFamilyReceipts && (
                        <Pressable
                          style={[styles.cornerButton, showOnlyMine && styles.cornerButtonActive]}
                          onPress={() => setShowOnlyMine((v) => !v)}
                          hitSlop={6}
                        >
                          {showOnlyMine ? (
                            <User color={colors.background} size={18} />
                          ) : (
                            <Users color={colors.accent} size={18} />
                          )}
                        </Pressable>
                      )}
                      <Pressable style={styles.cornerButton} onPress={toggleFlip} hitSlop={6}>
                        <CalendarDays color={colors.accent} size={18} />
                      </Pressable>
                    </View>

                    {chartStyle === 'donut' ? (
                      <View style={styles.donutWrap}>
                        <DonutChart
                          segments={segments}
                          size={200}
                          strokeWidth={26}
                          centerTop={`${monthTotal.toFixed(0)} ${categoryCurrency}`}
                          centerBottom="Всего"
                        />
                      </View>
                    ) : (
                      <View style={styles.barsWrap}>
                        <Text style={styles.barsTotal}>
                          {monthTotal.toFixed(0)} {categoryCurrency}
                        </Text>
                        <Text style={styles.barsTotalSub}>Всего за месяц</Text>
                      </View>
                    )}

                    <View style={styles.legend}>
                      {categories.map((entry) => (
                        <Pressable
                          key={entry.categoryName}
                          style={styles.legendRow}
                          onPress={() => rootNav()?.navigate('Category', { categoryName: entry.categoryName })}
                        >
                          <View
                            style={[styles.legendDot, { backgroundColor: getCategoryColor(entry.categoryName) }]}
                          />
                          <View style={styles.legendBody}>
                            <View style={styles.legendTopRow}>
                              <Text style={styles.legendName}>{entry.categoryName}</Text>
                              <Text style={styles.legendAmount}>
                                {entry.total.toFixed(0)} {categoryCurrency}
                              </Text>
                              <Text style={styles.legendPercent}>{entry.percent.toFixed(0)}%</Text>
                            </View>
                            {chartStyle === 'bars' && (
                              <View style={styles.barTrack}>
                                <View
                                  style={[
                                    styles.barFill,
                                    {
                                      width: `${Math.max((entry.total / maxCategoryTotal) * 100, 3)}%`,
                                      backgroundColor: getCategoryColor(entry.categoryName),
                                    },
                                  ]}
                                />
                              </View>
                            )}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </Animated.View>
                </View>
              </FadeInView>
            )}

            <Text style={styles.sectionTitle}>Чеки</Text>
          </View>
        }
      />

      <ReceiptQuickActions
        receipt={quickActionsReceipt}
        onClose={() => setQuickActionsReceipt(null)}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      {/* Очередь чеков без сети: посмотреть, отправить, удалить */}
      <Modal visible={queueVisible} transparent animationType="slide" onRequestClose={() => setQueueVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setQueueVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Чеки в очереди ({pendingScans.length})</Text>
            <Text style={styles.sheetSub}>Сняты без интернета. Отправьте, когда появится сеть, или удалите.</Text>
            {pendingScans.map((scan) => (
              <View key={scan.id} style={styles.queueRow}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${scan.imageBase64}` }}
                  style={styles.queueThumb}
                />
                <View style={styles.queueInfo}>
                  <Text style={styles.queueDate}>
                    {new Date(scan.createdAt).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.queueStatus}>Ждёт отправки</Text>
                </View>
                <Pressable
                  style={styles.queueSend}
                  onPress={() => sendQueuedScan(scan)}
                  disabled={sendingQueueId !== null}
                >
                  <Send color={colors.background} size={16} />
                </Pressable>
                <Pressable style={styles.queueDelete} onPress={() => deleteQueuedScan(scan)} hitSlop={6}>
                  <Trash2 color={colors.error} size={18} />
                </Pressable>
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 20,
    paddingTop: 64,
  },
  header: {
    marginBottom: 16,
    gap: 16,
  },
  screenTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 12,
    padding: 12,
  },
  queueBannerText: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
  },
  flipWrap: {
    position: 'relative',
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
  },
  cardCorner: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    flexDirection: 'row',
    gap: 8,
  },
  cardCornerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cornerButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerButtonActive: {
    backgroundColor: colors.accent,
  },
  calendarTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 11,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.8,
    padding: 2,
  },
  dayInner: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  daySpent: {
    backgroundColor: colors.accentSoft,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  dayText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  dayTextSpent: {
    color: colors.accent,
    fontWeight: '700',
  },
  daySpentAmount: {
    color: colors.accent,
    fontSize: 8,
    fontWeight: '700',
  },
  calendarLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  donutWrap: {
    alignItems: 'center',
  },
  barsWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  barsTotal: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  barsTotalSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  legend: {
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendBody: {
    flex: 1,
    gap: 5,
  },
  legendTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  legendAmount: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  legendPercent: {
    color: colors.textSecondary,
    fontSize: 13,
    width: 40,
    textAlign: 'right',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    maxHeight: '80%',
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSub: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 10,
  },
  queueThumb: {
    width: 48,
    height: 62,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  queueInfo: {
    flex: 1,
  },
  queueDate: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  queueStatus: {
    color: colors.warning,
    fontSize: 12,
    marginTop: 2,
  },
  queueSend: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueDelete: {
    padding: 6,
  },
}));
