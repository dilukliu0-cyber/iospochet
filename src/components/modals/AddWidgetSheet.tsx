import { ChartBar, Target, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useHomeWidgetsStore } from '../../store/homeWidgetsStore';
import { useLimitsStore } from '../../store/limitsStore';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenLimits: () => void;
};

export function AddWidgetSheet({ visible, onClose, onOpenLimits }: Props) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const limits = useLimitsStore((state) => state.limits);
  const fetchLimits = useLimitsStore((state) => state.fetch);
  const addWidget = useHomeWidgetsStore((state) => state.addWidget);
  const [step, setStep] = useState<'menu' | 'pickLimit'>('menu');

  useEffect(() => {
    if (visible && userId) fetchLimits(userId);
    if (!visible) setStep('menu');
  }, [visible, userId, fetchLimits]);

  async function handleAddChart() {
    if (!userId) return;
    await addWidget(userId, 'category_chart');
    onClose();
  }

  function handlePinLimitPress() {
    if (limits.length === 0) {
      onOpenLimits();
      return;
    }
    setStep('pickLimit');
  }

  async function handlePickLimit(limitId: string) {
    if (!userId) return;
    await addWidget(userId, 'pinned_limit', { limitId });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {step === 'menu' ? 'Добавить виджет' : 'Выберите лимит'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X color={colors.textSecondary} size={20} />
            </Pressable>
          </View>

          {step === 'menu' ? (
            <View style={styles.tiles}>
              <Pressable style={styles.tile} onPress={handleAddChart}>
                <View style={styles.tileIcon}>
                  <ChartBar color={colors.accent} size={22} />
                </View>
                <Text style={styles.tileLabel}>Диаграмма по категориям</Text>
              </Pressable>
              <Pressable style={styles.tile} onPress={handlePinLimitPress}>
                <View style={styles.tileIcon}>
                  <Target color={colors.accent} size={22} />
                </View>
                <Text style={styles.tileLabel}>Закрепить лимит</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={styles.limitList} contentContainerStyle={styles.limitListContent}>
              {limits.map((limit) => (
                <Pressable key={limit.id} style={styles.limitRow} onPress={() => handlePickLimit(limit.id)}>
                  <Text style={styles.limitRowText}>{limit.category_name}</Text>
                  <Text style={styles.limitRowAmount}>
                    {limit.amount.toFixed(0)} {limit.currency}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = themedStyles(() => StyleSheet.create({
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
    gap: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  tiles: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 16,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  limitList: {
    maxHeight: 300,
  },
  limitListContent: {
    gap: 8,
    paddingBottom: 16,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
  },
  limitRowText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  limitRowAmount: {
    color: colors.textSecondary,
    fontSize: 13,
  },
}));
