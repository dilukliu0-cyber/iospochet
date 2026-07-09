import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  fetchMonthlyCategoryBreakdown,
  type CategoryBreakdownEntry,
} from '../../services/analytics/categoryBreakdown';
import { useAuthStore } from '../../store/authStore';
import { useHomeWidgetsStore } from '../../store/homeWidgetsStore';
import { useLimitsStore } from '../../store/limitsStore';
import { colors } from '../../theme/colors';
import type { HomeWidget } from '../../types/homeWidget';
import { themedStyles } from '../../theme/themedStyles';

type Props = {
  widget: HomeWidget;
};

export function HomeWidgetCard({ widget }: Props) {
  const removeWidget = useHomeWidgetsStore((state) => state.removeWidget);

  return (
    <View style={styles.card}>
      <Pressable style={styles.removeButton} onPress={() => removeWidget(widget.id)} hitSlop={8}>
        <X color={colors.textSecondary} size={16} />
      </Pressable>
      {widget.type === 'category_chart' ? <CategoryChartWidget /> : <PinnedLimitWidget limitId={widget.config.limitId} />}
    </View>
  );
}

function CategoryChartWidget() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [entries, setEntries] = useState<CategoryBreakdownEntry[]>([]);
  const [currency, setCurrency] = useState('');

  useEffect(() => {
    if (!userId) return;
    fetchMonthlyCategoryBreakdown(userId).then((result) => {
      setEntries(result.entries.slice(0, 5));
      setCurrency(result.currency);
    });
  }, [userId]);

  const max = Math.max(1, ...entries.map((e) => e.total));

  return (
    <View>
      <Text style={styles.title}>Диаграмма по категориям</Text>
      {entries.length === 0 ? (
        <Text style={styles.emptyText}>Пока нет данных за этот месяц.</Text>
      ) : (
        <View style={styles.chart}>
          {entries.map((entry) => (
            <View key={entry.categoryName} style={styles.chartRow}>
              <Text style={styles.chartLabel} numberOfLines={1}>
                {entry.categoryName}
              </Text>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBarFill, { width: `${(entry.total / max) * 100}%` }]} />
              </View>
              <Text style={styles.chartValue}>
                {entry.total.toFixed(0)} {currency}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PinnedLimitWidget({ limitId }: { limitId?: string }) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const limits = useLimitsStore((state) => state.limits);
  const fetchLimits = useLimitsStore((state) => state.fetch);
  const [spent, setSpent] = useState(0);

  useEffect(() => {
    if (userId) fetchLimits(userId);
  }, [userId, fetchLimits]);

  const limit = limits.find((l) => l.id === limitId);

  useEffect(() => {
    if (!userId || !limit) return;
    fetchMonthlyCategoryBreakdown(userId).then(({ entries }) => {
      setSpent(entries.find((e) => e.categoryName === limit.category_name)?.total ?? 0);
    });
  }, [userId, limit]);

  if (!limit) {
    return <Text style={styles.emptyText}>Лимит удалён.</Text>;
  }

  const percent = limit.amount > 0 ? (spent / limit.amount) * 100 : 0;
  const barColor = percent >= 100 ? colors.error : percent >= 75 ? colors.warning : colors.success;

  return (
    <View>
      <Text style={styles.title}>Лимит «{limit.category_name}»</Text>
      <Text style={styles.limitAmount}>
        {spent.toFixed(0)} / {limit.amount.toFixed(0)} {limit.currency}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    paddingRight: 20,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  chart: {
    gap: 10,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    width: 80,
  },
  chartBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  chartValue: {
    color: colors.textPrimary,
    fontSize: 12,
    width: 64,
    textAlign: 'right',
  },
  limitAmount: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
}));
