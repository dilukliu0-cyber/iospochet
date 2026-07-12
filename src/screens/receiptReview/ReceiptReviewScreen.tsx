import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Trash2, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SelectableRow } from '../../components/ui/SelectableRow';
import { TextField } from '../../components/ui/TextField';
import { saveReceipt } from '../../services/receipts/receiptsService';
import { scanReceipt } from '../../services/ai/scanReceipt';
import { enqueueScan, isNetworkError } from '../../services/offlineQueue/offlineQueue';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import type { AppStackParamList } from '../../navigation/types';
import { CATEGORY_NAMES } from '../../utils/categoryIconMap';
import type { RecognizedItem } from '../../types/receipt';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type Props = NativeStackScreenProps<AppStackParamList, 'ReceiptReview'>;

export function ReceiptReviewScreen({ route, navigation }: Props) {
  const { imageBase64, imageUri, recognized, queuedPhotos = [] } = route.params;
  const userId = useAuthStore((state) => state.session?.user.id);
  const [items, setItems] = useState<RecognizedItem[]>(recognized.items);
  const [saving, setSaving] = useState(false);
  const [advancingQueue, setAdvancingQueue] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');

  function openEdit(index: number) {
    setEditingIndex(index);
    setEditName(items[index].cleanedName);
    setEditPrice(items[index].price.toFixed(2));
    setEditCategory(items[index].category);
  }

  function applyEdit() {
    if (editingIndex === null) return;
    const parsedPrice = Number(editPrice.replace(',', '.'));
    setItems((prev) =>
      prev.map((item, i) =>
        i === editingIndex
          ? {
              ...item,
              cleanedName: editName.trim() || item.cleanedName,
              price: Number.isFinite(parsedPrice) ? parsedPrice : item.price,
              category: editCategory,
              needsReview: false,
            }
          : item,
      ),
    );
    setEditingIndex(null);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const baseCurrency = useSettingsStore((state) => state.settings?.currency ?? 'CZK');
  const showToast = useToastStore((state) => state.show);

  async function handleSave(force = false) {
    if (!userId) return;
    setSaving(true);
    const result = await saveReceipt(userId, imageBase64, { ...recognized, items }, { baseCurrency, force });
    setSaving(false);

    if (result.duplicate) {
      // §28.1: диалог вместо тихого создания дубликата.
      Alert.alert(
        'Похоже, этот чек уже добавлен',
        `${result.duplicate.date ?? 'Сегодня'}, ${result.duplicate.total.toFixed(2)} ${recognized.currency}. Сохранить как новый?`,
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Сохранить как новый', onPress: () => handleSave(true) },
        ],
      );
      return;
    }

    if (result.error) {
      Alert.alert('Не удалось сохранить чек', result.error);
      return;
    }

    if (result.checkedShoppingItems > 0) {
      const n = result.checkedShoppingItems;
      const word = n === 1 ? 'товар' : n < 5 ? 'товара' : 'товаров';
      showToast(`Список покупок обновлён: отмечено ${n} ${word}`);
    } else {
      showToast('Чек сохранён');
    }

    if (queuedPhotos.length > 0) {
      await advanceToNext(queuedPhotos);
      return;
    }

    navigation.popToTop();
  }

  async function advanceToNext(queue: typeof queuedPhotos) {
    setAdvancingQueue(true);
    const [next, ...rest] = queue;
    const { data, error } = await scanReceipt(next.base64, 'image/jpeg');
    setAdvancingQueue(false);

    if (error || !data) {
      if (isNetworkError(error)) {
        await enqueueScan(next.base64);
        for (const item of rest) await enqueueScan(item.base64);
        Alert.alert(
          'Нет соединения',
          'Оставшиеся фото чеков сохранены в очередь. Обработаем со вкладки «Расходы», когда появится интернет.',
        );
      } else {
        Alert.alert('Не удалось распознать следующий чек', error ?? 'Попробуйте отсканировать его отдельно.');
      }
      navigation.popToTop();
      return;
    }

    navigation.replace('ReceiptReview', {
      imageBase64: next.base64,
      imageUri: next.uri,
      recognized: data,
      queuedPhotos: rest,
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Чек распознан</Text>
        {queuedPhotos.length > 0 && (
          <Text style={styles.queueSubtitle}>Ещё {queuedPhotos.length} в очереди — сохраните, чтобы продолжить</Text>
        )}

        <View style={styles.summaryCard}>
          <Image source={{ uri: imageUri }} style={styles.thumbnail} />
          <View style={styles.summaryInfo}>
            <Text style={styles.storeName}>{recognized.storeName || 'Магазин не распознан'}</Text>
            {recognized.storeAddress && <Text style={styles.storeAddress}>{recognized.storeAddress}</Text>}
            <Text style={styles.dateTime}>
              {[recognized.purchaseDate, recognized.purchaseTime].filter(Boolean).join(' ')}
            </Text>
            <Text style={styles.total}>
              {recognized.totalAmount.toFixed(2)} {recognized.currency}
            </Text>
          </View>
        </View>

        {recognized.warnings.length > 0 && (
          <View style={styles.warningsCard}>
            {recognized.warnings.map((warning, index) => (
              <View key={index} style={styles.warningRow}>
                <TriangleAlert color={colors.warning} size={16} />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Товары ({items.length})</Text>

        <View style={styles.items}>
          {items.map((item, index) => {
            return (
              <Pressable
                key={index}
                style={[styles.itemRow, item.needsReview && styles.itemRowReview]}
                onPress={() => openEdit(index)}
              >
                <CategoryIcon category={item.category} itemName={item.cleanedName} size={40} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.cleanedName}</Text>
                  <Text style={styles.itemCategory}>
                    {item.category}
                    {item.needsReview ? ' · нужно проверить' : ''}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  {item.price.toFixed(2)} {recognized.currency}
                </Text>
                <Pressable onPress={() => removeItem(index)} hitSlop={10} style={styles.deleteButton}>
                  <Trash2 color={colors.textTertiary} size={16} />
                </Pressable>
              </Pressable>
            );
          })}
          {items.length === 0 && <Text style={styles.emptyText}>Все товары удалены.</Text>}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={queuedPhotos.length > 0 ? 'Сохранить и продолжить' : 'Сохранить чек'}
          onPress={() => handleSave()}
          loading={saving || advancingQueue}
          disabled={items.length === 0}
        />
      </View>

      {advancingQueue && (
        <View style={styles.advancingOverlay}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.advancingText}>Распознаём следующий чек...</Text>
        </View>
      )}

      <Modal
        visible={editingIndex !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingIndex(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setEditingIndex(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Редактировать товар</Text>
            <TextField label="Название" value={editName} onChangeText={setEditName} />
            <TextField
              label={`Цена (${recognized.currency})`}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
            />
            <Text style={styles.sheetLabel}>Категория</Text>
            <ScrollView style={styles.categoryList} contentContainerStyle={styles.categoryListContent}>
              {CATEGORY_NAMES.map((name) => (
                <SelectableRow
                  key={name}
                  label={name}
                  selected={editCategory === name}
                  onPress={() => setEditCategory(name)}
                />
              ))}
            </ScrollView>
            <PrimaryButton label="Готово" onPress={applyEdit} />
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
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 32,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  queueSubtitle: {
    color: colors.accent,
    fontSize: 13,
    marginTop: -8,
  },
  advancingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,12,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  advancingText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  summaryCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
  },
  thumbnail: {
    width: 64,
    height: 84,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
  },
  summaryInfo: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  storeAddress: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  dateTime: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  total: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  warningsCard: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    color: colors.warning,
    fontSize: 13,
    flex: 1,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  items: {
    gap: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
  },
  itemRowReview: {
    borderWidth: 1,
    borderColor: colors.warning,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  itemCategory: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  itemPrice: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    paddingLeft: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    maxHeight: '85%',
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  categoryList: {
    maxHeight: 240,
  },
  categoryListContent: {
    gap: 8,
  },
}));
