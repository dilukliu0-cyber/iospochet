import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PenLine, ScanLine, ShieldCheck, Sparkles, User, Users } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkline } from '../../components/charts/Sparkline';
import { AddWidgetSheet } from '../../components/modals/AddWidgetSheet';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { FadeInView } from '../../components/ui/FadeInView';
import { HomeWidgetCard } from '../../components/widgets/HomeWidgetCard';
import type { AppStackParamList } from '../../navigation/types';
import { fetchMonthlyCategoryBreakdown } from '../../services/analytics/categoryBreakdown';
import { checkAiDigest } from '../../services/ai/aiDigest';
import { avatarUrl } from '../../services/profile/avatarService';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useHomeWidgetsStore } from '../../store/homeWidgetsStore';
import { useLimitsStore } from '../../store/limitsStore';
import { useReceiptsStore } from '../../store/receiptsStore';
import { colors } from '../../theme/colors';
import type { ReceiptRecord } from '../../types/receiptRecord';
import { themedStyles } from '../../theme/themedStyles';

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
  const avatar = avatarUrl(settings?.avatar_path ?? null, settings?.updated_at);
  const receipts = useReceiptsStore((state) => state.receipts);
  const fetchReceipts = useReceiptsStore((state) => state.fetch);
  const widgets = useHomeWidgetsStore((state) => state.widgets);
  const fetchWidgets = useHomeWidgetsStore((state) => state.fetch);
  const limits = useLimitsStore((state) => state.limits);
  const fetchLimits = useLimitsStore((state) => state.fetch);

  const [spentByCategory, setSpentByCategory] = useState<Record<string, number>>({});
  const [topCategories, setTopCategories] = useState<
    { categoryName: string; total: number; percent: number }[]
  >([]);
  const [categoryCurrency, setCategoryCurrency] = useState('');
  const [addWidgetVisible, setAddWidgetVisible] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetchReceipts(userId);
      fetchWidgets(userId);
      fetchLimits(userId);
      fetchMonthlyCategoryBreakdown(userId).then(({ entries, currency: cur }) => {
        const map: Record<string, number> = {};
        entries.forEach((e) => (map[e.categoryName] = e.total));
        setSpentByCategory(map);
        setTopCategories(entries.slice(0, 5));
        setCategoryCurrency(cur);
      });
      checkAiDigest();
    }, [userId, fetchReceipts, fetchWidgets, fetchLimits]),
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.headerRow}>
        <Pressable onLongPress={() => setAddWidgetVisible(true)}>
          <Text style={styles.greeting}>👋 Привет{nickname ? `, ${nickname}` : ''}!</Text>
          <Text style={styles.greetingSub}>Отличного дня! Вот что происходит:</Text>
        </Pressable>
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
                  onPress={() => setShowOnlyMine((v) => !v)}
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
          <Text style={styles.spendTotal}>
            {total.toFixed(2)} {currency}
          </Text>
          {changePercent !== null && (
            <Text style={styles.spendSub}>
              {changePercent <= 0 ? 'Меньше' : 'Больше'} на {Math.abs(changePercent)}%, чем в прошлом месяце
            </Text>
          )}
          {dailySeries.length >= 2 && (
            <View style={styles.chartWrap}>
              <Sparkline data={dailySeries} width={300} height={72} />
            </View>
          )}
        </View>
      </FadeInView>

      <FadeInView index={2}>
        <Text style={styles.sectionTitle}>Быстрые действия</Text>
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() => navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate('Scan')}
          >
            <ScanLine color={colors.accent} size={20} />
            <Text style={styles.actionLabel}>Сканировать чек</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate('AddExpense')
            }
          >
            <PenLine color={colors.accent} size={20} />
            <Text style={styles.actionLabel}>Добавить вручную</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.limitsButton}
          onPress={() => navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate('Limits')}
        >
          <ShieldCheck color={colors.accent} size={20} />
          <Text style={styles.limitsButtonLabel}>Лимиты и бюджет</Text>
        </Pressable>
      </FadeInView>

      {topCategories.length > 0 && (
        <FadeInView index={3}>
          <Text style={styles.sectionTitle}>Топ-5 категорий</Text>
          <View style={styles.topCategories}>
            {topCategories.map((entry) => (
              <Pressable
                key={entry.categoryName}
                style={styles.categoryRow}
                onPress={() =>
                  navigation
                    .getParent<NativeStackNavigationProp<AppStackParamList>>()
                    ?.navigate('Category', { categoryName: entry.categoryName })
                }
              >
                <CategoryIcon category={entry.categoryName} size={36} />
                <Text style={styles.categoryName}>{entry.categoryName}</Text>
                <Text style={styles.categoryAmount}>
                  {entry.total.toFixed(0)} {categoryCurrency}
                </Text>
                <Text style={styles.categoryPercent}>{entry.percent.toFixed(0)}%</Text>
              </Pressable>
            ))}
          </View>
        </FadeInView>
      )}

      {widgets.length > 0 && (
        <View style={styles.widgetsSection}>
          {widgets.map((widget) => (
            <HomeWidgetCard key={widget.id} widget={widget} />
          ))}
        </View>
      )}

      {receipts.length === 0 && (
        <Text style={styles.hint}>Отсканируйте первый чек кнопкой выше — «Сканировать чек».</Text>
      )}

      <AddWidgetSheet
        visible={addWidgetVisible}
        onClose={() => setAddWidgetVisible(false)}
        onOpenLimits={() => {
          setAddWidgetVisible(false);
          navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate('Limits');
        }}
      />
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  greetingSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  aiCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
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
    borderRadius: 18,
    padding: 18,
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
    borderRadius: 9,
    backgroundColor: colors.accentSoft,
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
    fontSize: 30,
    fontWeight: '700',
    marginTop: 8,
  },
  spendSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  chartWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  limitsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  limitsButtonLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  topCategories: {
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
  },
  categoryName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryAmount: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryPercent: {
    color: colors.textSecondary,
    fontSize: 12,
    minWidth: 34,
    textAlign: 'right',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  widgetsSection: {
    gap: 12,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
}));
