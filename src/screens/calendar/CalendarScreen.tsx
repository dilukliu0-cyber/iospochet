import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, ChevronLeft, ChevronRight, PieChart } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ReceiptListItem } from '../../components/cards/ReceiptListItem';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import type { AppStackParamList } from '../../navigation/types';
import {
  fetchMonthlyCategoryBreakdown,
  type CategoryBreakdownEntry,
} from '../../services/analytics/categoryBreakdown';
import { useAuthStore } from '../../store/authStore';
import { useReceiptsStore } from '../../store/receiptsStore';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

const MONTH_TITLES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toDateKey(dateStr: string | null, createdAt: string): string {
  return dateStr ?? createdAt.slice(0, 10);
}

type Props = NativeStackScreenProps<AppStackParamList, 'Calendar'>;

export function CalendarScreen({ navigation }: Props) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const receipts = useReceiptsStore((state) => state.receipts);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [analysisVisible, setAnalysisVisible] = useState(false);
  const [analysis, setAnalysis] = useState<CategoryBreakdownEntry[]>([]);
  const [analysisCurrency, setAnalysisCurrency] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const { totalsByDay, monthTotal, currency } = useMemo(() => {
    const totals = new Map<string, number>();
    let sum = 0;
    let cur = '';
    for (const receipt of receipts) {
      const key = toDateKey(receipt.purchase_date, receipt.created_at);
      const [y, m] = key.split('-').map(Number);
      if (y !== year || m !== month + 1) continue;
      const amount = (receipt.total_amount ?? 0) * (receipt.exchange_rate ?? 1);
      totals.set(key, (totals.get(key) ?? 0) + amount);
      sum += amount;
      if (!cur) cur = receipt.base_currency ?? receipt.currency;
    }
    return { totalsByDay: totals, monthTotal: sum, currency: cur };
  }, [receipts, year, month]);

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Неделя с понедельника (§37, этап 17).
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: (number | null)[] = [
      ...Array.from({ length: startOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDay(null);
  }

  useEffect(() => {
    if (!analysisVisible || !userId) return;
    setAnalysisLoading(true);
    fetchMonthlyCategoryBreakdown(userId, new Date(year, month, 1)).then(({ entries, currency }) => {
      setAnalysis(entries);
      setAnalysisCurrency(currency);
      setAnalysisLoading(false);
    });
  }, [analysisVisible, userId, year, month]);

  function toggleAnalysis() {
    setAnalysisVisible((v) => !v);
  }

  function dayKey(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const selectedReceipts = selectedDay
    ? receipts.filter((r) => toDateKey(r.purchase_date, r.created_at) === selectedDay)
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.topTitle}>Календарь</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={8}>
            <ChevronLeft color={colors.textPrimary} size={22} />
          </Pressable>
          <Text style={styles.monthTitle}>
            {MONTH_TITLES[month]} {year}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={8}>
            <ChevronRight color={colors.textPrimary} size={22} />
          </Pressable>
        </View>

        <Text style={styles.monthTotal}>
          {monthTotal.toFixed(2)} {currency || ''}
        </Text>

        <Pressable style={styles.analysisButton} onPress={toggleAnalysis}>
          <PieChart color={colors.accent} size={16} />
          <Text style={styles.analysisButtonText}>
            {analysisVisible ? 'Скрыть анализ месяца' : 'Показать анализ месяца'}
          </Text>
        </Pressable>

        {analysisVisible && (
          <View style={styles.analysisCard}>
            {analysisLoading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : analysis.length === 0 ? (
              <Text style={styles.emptyText}>В этом месяце трат не было.</Text>
            ) : (
              analysis.map((entry) => (
                <View key={entry.categoryName} style={styles.analysisRow}>
                  <CategoryIcon category={entry.categoryName} size={32} />
                  <Text style={styles.analysisName}>{entry.categoryName}</Text>
                  <Text style={styles.analysisAmount}>
                    {entry.total.toFixed(0)} {analysisCurrency}
                  </Text>
                  <Text style={styles.analysisPercent}>{entry.percent.toFixed(0)}%</Text>
                </View>
              ))
            )}
          </View>
        )}

        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>

        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              if (day === null) return <View key={dayIndex} style={styles.dayCell} />;
              const key = dayKey(day);
              const dayTotal = totalsByDay.get(key);
              const selected = selectedDay === key;
              return (
                <Pressable
                  key={dayIndex}
                  style={[styles.dayCell, dayTotal !== undefined && styles.dayCellActive, selected && styles.dayCellSelected]}
                  onPress={() => setSelectedDay(selected ? null : key)}
                >
                  <Text style={[styles.dayNumber, selected && { color: colors.background }]}>{day}</Text>
                  {dayTotal !== undefined && (
                    <Text style={[styles.dayTotal, selected && { color: colors.background }]} numberOfLines={1}>
                      {dayTotal.toFixed(0)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        {selectedDay && (
          <View style={styles.dayReceipts}>
            <Text style={styles.sectionTitle}>Чеки за {selectedDay}</Text>
            {selectedReceipts.map((receipt) => (
              <ReceiptListItem
                key={receipt.id}
                receipt={receipt}
                onPress={() => navigation.navigate('ReceiptDetail', { receiptId: receipt.id })}
                onLongPress={() => {}}
              />
            ))}
            {selectedReceipts.length === 0 && <Text style={styles.emptyText}>В этот день чеков нет.</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 10,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  monthTotal: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  analysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
  },
  analysisButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  analysisCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analysisName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  analysisAmount: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  analysisPercent: {
    color: colors.textSecondary,
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
  weekdaysRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  weekday: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayCellActive: {
    backgroundColor: colors.surface,
  },
  dayCellSelected: {
    backgroundColor: colors.accent,
  },
  dayNumber: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  dayTotal: {
    color: colors.accent,
    fontSize: 9,
  },
  dayReceipts: {
    marginTop: 12,
    gap: 10,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
}));
