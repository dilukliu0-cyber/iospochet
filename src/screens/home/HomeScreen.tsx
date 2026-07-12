import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PenLine, ScanLine, ShieldCheck, Sparkles, User, Users, WalletCards } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DailyBarChart } from '../../components/charts/DailyBarChart';
import { LineChart } from '../../components/charts/LineChart';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { FadeInView } from '../../components/ui/FadeInView';
import { Skeleton } from '../../components/ui/Skeleton';
import type { AppStackParamList } from '../../navigation/types';
import { fetchMonthlyCategoryBreakdown } from '../../services/analytics/categoryBreakdown';
import { checkAiDigest } from '../../services/ai/aiDigest';
import { avatarUrl } from '../../services/profile/avatarService';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useLimitsStore } from '../../store/limitsStore';
import { useReceiptsStore } from '../../store/receiptsStore';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { AnimatedProgressBar } from '../../components/ui/AnimatedProgressBar';
import { colors, progressColor } from '../../theme/colors';
import type { ReceiptRecord } from '../../types/receiptRecord';
import { themedStyles } from '../../theme/themedStyles';
import { haptics } from '../../utils/haptics';

const MONTH_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function receiptDate(r: ReceiptRecord): Date {
  return r.purchase_date ? new Date(r.purchase_date) : new Date(r.created_at);
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);
  const settings = useSettingsStore((state) => state.settings);
  const nickname = settings?.nickname?.trim() ?? '';
  const homeChart = settings?.home_chart ?? 'line';
  const avatar = avatarUrl(settings?.avatar_path ?? null, settings?.updated_at);
  const receipts = useReceiptsStore((state) => state.receipts);
  const receiptsLoading = useReceiptsStore((state) => state.isLoading);
  const fetchReceipts = useReceiptsStore((state) => state.fetch);
  const limits = useLimitsStore((state) => state.limits);
  const limitsLoading = useLimitsStore((state) => state.isLoading);
  const fetchLimits = useLimitsStore((state) => state.fetch);
  // Первая загрузка (ещё нет ни чеков, ни лимитов) — показываем skeleton
  // вместо пустой карточки, которая на миг мелькает перед данными.
  const isFirstLoad = (receiptsLoading || limitsLoading) && receipts.length === 0 && limits.length === 0;

  const [spentByCategory, setSpentByCategory] = useState<Record<string, number>>({});
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetchReceipts(userId);
      fetchLimits(userId);
      fetchMonthlyCategoryBreakdown(userId).then(({ entries }) => {
        const map: Record<string, number> = {};
        entries.forEach((e) => (map[e.categoryName] = e.total));
        setSpentByCategory(map);
      });
      checkAiDigest();
    }, [userId, fetchReceipts, fetchLimits]),
  );

  const now = new Date();
  // «1–7 июля» вместо просто названия месяца (§ пожелание: видеть даты, а не только график).
  const monthGen = MONTH_GENITIVE[now.getMonth()];
  const periodLabel = now.getDate() === 1 ? `1 ${monthGen}` : `1–${now.getDate()} ${monthGen}`;

  const hasFamilyReceipts = receipts.some((r) => r.user_id !== userId);
  const filteredReceipts = showOnlyMine ? receipts.filter((r) => r.user_id === userId) : receipts;

  const { total, currency, changePercent, dailySeries } = useMemo(() => {
    const inMonth = (d: Date, m: number) =>
      d.getFullYear() === now.getFullYear() && d.getMonth() === m;

    const thisMonth = filteredReceipts.filter((r) => inMonth(receiptDate(r), now.getMonth()));
    const prevMonthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonth = filteredReceipts.filter((r) => inMonth(receiptDate(r), prevMonthIndex));

    const sum = (list: ReceiptRecord[]) =>
      list.reduce((s, r) => s + (r.total_amount ?? 0) * (r.exchange_rate ?? 1), 0);

    const thisTotal = sum(thisMonth);
    const lastTotal = sum(lastMonth);
    const change = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : null;

    // Ежедневные суммы по текущему месяцу для мини-графика.
    const daysPassed = now.getDate();
    const perDay = new Array(daysPassed).fill(0);
    thisMonth.forEach((r) => {
      const day = receiptDate(r).getDate();
      if (day >= 1 && day <= daysPassed) perDay[day - 1] += (r.total_amount ?? 0) * (r.exchange_rate ?? 1);
    });

    return {
      total: thisTotal,
      currency: thisMonth[0]?.base_currency ?? thisMonth[0]?.currency ?? filteredReceipts[0]?.currency ?? '',
      changePercent: change,
      dailySeries: perDay,
    };
  }, [filteredReceipts]);

  // ИИ-рекомендации из реальных данных (лимиты у порога).
  const recommendations = useMemo(() => {
    const tips: string[] = [];
    for (const limit of limits) {
      const spent = spentByCategory[limit.category_name] ?? 0;
      const percent = limit.amount > 0 ? (spent / limit.amount) * 100 : 0;
      if (percent >= 100) {
        tips.push(`Лимит «${limit.category_name}» превышен`);
      } else if (percent >= 75) {
        tips.push(`Ты близок к лимиту «${limit.category_name}» (${Math.round(percent)}%)`);
      }
    }
    if (changePercent !== null && changePercent < 0) {
      tips.push(`Расходы на ${Math.abs(changePercent)}% меньше, чем в прошлом месяце`);
    }
    return tips.slice(0, 3);
  }, [limits, spentByCategory, changePercent]);

  // Ближайшие к превышению лимиты — самое важное про бюджет на главном
  // экране (детали по категориям уже есть на вкладке «Расходы»).
  const topLimits = useMemo(() => {
    return limits
      .map((limit) => {
        const spent = spentByCategory[limit.category_name] ?? 0;
        return { ...limit, spent, percent: limit.amount > 0 ? (spent / limit.amount) * 100 : 0 };
      })
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3);
  }, [limits, spentByCategory]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>Главная</Text>
        <View style={styles.headerRight}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(nickname[0] ?? '?').toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      {recommendations.length > 0 && (
        <FadeInView index={0}>
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Sparkles color={colors.accent} size={18} />
              <Text style={styles.aiTitle}>
                ИИ нашёл {recommendations.length}{' '}
                {recommendations.length === 1 ? 'рекомендацию' : 'рекомендации'}
              </Text>
            </View>
            {recommendations.map((tip, i) => (
              <View key={i} style={styles.aiBullet}>
                <View style={styles.aiDot} />
                <Text style={styles.aiBulletText}>{tip}</Text>
              </View>
            ))}
          </View>
        </FadeInView>
      )}

      {isFirstLoad ? (
        <FadeInView index={1}>
          <View style={styles.spendCard}>
            <Skeleton width={140} height={13} />
            <Skeleton width={180} height={34} style={{ marginTop: 10 }} />
            <Skeleton width="100%" height={150} borderRadius={12} style={{ marginTop: 14 }} />
          </View>
        </FadeInView>
      ) : (
        <FadeInView index={1}>
          <View style={styles.spendCard}>
            <View style={styles.spendHeader}>
              <Text style={styles.spendLabel}>Расходы за {periodLabel}</Text>
              <View style={styles.spendHeaderRight}>
                {changePercent !== null && (
                  <View style={[styles.badge, changePercent <= 0 ? styles.badgeGood : styles.badgeBad]}>
                    <Text style={[styles.badgeText, changePercent <= 0 ? styles.badgeTextGood : styles.badgeTextBad]}>
                      {changePercent > 0 ? '+' : ''}
                      {changePercent}%
                    </Text>
                  </View>
                )}
                {hasFamilyReceipts && (
                  <Pressable
                    style={[styles.familyToggle, showOnlyMine && styles.familyToggleActive]}
                    onPress={() => {
                      haptics.selection();
                      setShowOnlyMine((v) => !v);
                    }}
                    hitSlop={6}
                  >
                    {showOnlyMine ? (
                      <User color={colors.background} size={14} />
                    ) : (
                      <Users color={colors.accent} size={14} />
                    )}
                  </Pressable>
                )}
              </View>
            </View>
            <AnimatedNumber
              value={total}
              formatter={(n) => `${n.toFixed(2)} ${currency}`}
              style={styles.spendTotal}
            />
            {changePercent !== null && (
              <Text style={styles.spendSub}>
                {changePercent <= 0 ? 'Меньше' : 'Больше'} на {Math.abs(changePercent)}%, чем в прошлом месяце
              </Text>
            )}
            {/* График в самой карточке расходов и меняется по настройке
                (линия «Динамика» или столбцы «По дням»). */}
            {dailySeries.length >= 2 && (
              <View style={styles.chartWrap}>
                {homeChart === 'daily' ? (
                  <DailyBarChart data={dailySeries} height={150} />
                ) : (
                  <LineChart data={dailySeries} height={150} />
                )}
              </View>
            )}
          </View>
        </FadeInView>
      )}

      <FadeInView index={2}>
        {/* Один явный главный жест (скан) + три равных второстепенных —
            вместо четырёх одинаковых по весу кнопок подряд. */}
        <Pressable
          style={[styles.scanGlow, styles.scanButton]}
          onPress={() => {
            haptics.medium();
            navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate('Scan');
          }}
        >
          <ScanLine color={colors.background} size={20} />
          <Text style={styles.scanButtonLabel}>Сканировать чек</Text>
        </Pressable>

        <View style={styles.tileRow}>
          <Pressable
            style={styles.tileButton}
            onPress={() => {
              haptics.light();
              navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate('AddExpense');
            }}
          >
            <PenLine color={colors.accent} size={20} strokeWidth={1.75} />
            <Text style={styles.tileLabel}>Вручную</Text>
          </Pressable>
          <Pressable
            style={styles.tileButton}
            onPress={() => {
              haptics.light();
              navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate('AddIncome');
            }}
          >
            <WalletCards color={colors.accent} size={20} strokeWidth={1.75} />
            <Text style={styles.tileLabel}>Доход</Text>
          </Pressable>
          <Pressable
            style={styles.tileButton}
            onPress={() => {
              haptics.light();
              navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate('Limits');
            }}
          >
            <ShieldCheck color={colors.accent} size={20} strokeWidth={1.75} />
            <Text style={styles.tileLabel}>Лимиты</Text>
          </Pressable>
        </View>
      </FadeInView>

      <FadeInView index={3}>
        <Text style={styles.sectionTitle}>Лимиты</Text>

        {isFirstLoad ? (
          <View style={styles.limitsList}>
            {[0, 1].map((i) => (
              <View key={i} style={styles.limitRow}>
                <Skeleton width={32} height={32} borderRadius={16} />
                <View style={styles.limitInfo}>
                  <Skeleton width="60%" height={13} />
                  <Skeleton width="100%" height={6} style={{ marginTop: 8 }} />
                </View>
              </View>
            ))}
          </View>
        ) : topLimits.length === 0 ? (
          <Pressable
            style={styles.limitsEmptyCard}
            onPress={() => navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate('Limits')}
          >
            <ShieldCheck color={colors.accent} size={22} strokeWidth={1.75} />
            <Text style={styles.limitsEmptyText}>
              Задайте лимит бюджета по категориям — здесь появится прогресс.
            </Text>
          </Pressable>
        ) : (
          <View style={styles.limitsList}>
            {topLimits.map((limit) => (
              <Pressable
                key={limit.id}
                style={styles.limitRow}
                onPress={() => {
                  haptics.light();
                  navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate('Limits');
                }}
              >
                <CategoryIcon category={limit.category_name} size={32} />
                <View style={styles.limitInfo}>
                  <View style={styles.limitTopRow}>
                    <Text style={styles.limitName}>{limit.category_name}</Text>
                    <Text style={[styles.limitPercent, { color: progressColor(limit.percent) }]}>
                      {limit.percent.toFixed(0)}%
                    </Text>
                  </View>
                  <AnimatedProgressBar percent={limit.percent} height={6} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </FadeInView>

      {!isFirstLoad && receipts.length === 0 && (
        <Text style={styles.hint}>Отсканируйте первый чек кнопкой выше — «Сканировать чек».</Text>
      )}
    </ScrollView>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  aiCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  aiBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  aiBulletText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },
  spendCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  spendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spendLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  spendHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  familyToggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyToggleActive: {
    backgroundColor: colors.accent,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeGood: {
    backgroundColor: colors.accentSoft,
  },
  badgeBad: {
    backgroundColor: 'rgba(239,68,68,0.14)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextGood: {
    color: colors.accent,
  },
  badgeTextBad: {
    color: colors.error,
  },
  spendTotal: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 8,
  },
  spendSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  chartWrap: {
    marginTop: 14,
    alignSelf: 'stretch',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  scanGlow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    paddingVertical: 16,
    backgroundColor: colors.accent,
  },
  scanButtonLabel: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  tileRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  tileButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tileLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  limitsEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  limitsEmptyText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  limitsList: {
    gap: 8,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  limitInfo: {
    flex: 1,
    gap: 6,
  },
  limitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  limitName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  limitPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
}));
