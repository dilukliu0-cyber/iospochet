import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Receipt as ReceiptIcon, RotateCw, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SelectableRow } from '../../components/ui/SelectableRow';
import { TextField } from '../../components/ui/TextField';
import type { AppStackParamList } from '../../navigation/types';
import { deleteReceipt, deleteReceiptItem, updateReceiptItem } from '../../services/receipts/receiptsService';
import { rescanReceipt } from '../../services/receipts/backgroundScan';
import { getReceiptImageUrl } from '../../services/receipts/receiptImage';
import { supabase } from '../../services/api/supabaseClient';
import { colors } from '../../theme/colors';
import type { ReceiptItemRecord, ReceiptRecord, ReceiptStatus } from '../../types/receiptRecord';
import { CATEGORY_NAMES } from '../../utils/categoryIconMap';
import { themedStyles } from '../../theme/themedStyles';

type Props = NativeStackScreenProps<AppStackParamList, 'ReceiptDetail'>;

const STATUS_LABEL: Record<ReceiptStatus, string> = {
  processing: 'Обрабатывается…',
  recognized: 'Распознано',
  needs_review: 'Нужно проверить',
  error: 'Не распознано',
};

const STATUS_COLOR: Record<ReceiptStatus, string> = {
  processing: colors.textSecondary,
  recognized: colors.success,
  needs_review: colors.warning,
  error: colors.error,
};

export function ReceiptDetailScreen({ route, navigation }: Props) {
  const { receiptId } = route.params;
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(null);
  const [items, setItems] = useState<ReceiptItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceiptItemRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [rescanning, setRescanning] = useState(false);

  useEffect(() => {
    load();
  }, [receiptId]);

  async function load() {
    const [{ data: receiptData }, { data: itemsData }] = await Promise.all([
      supabase.from('receipts').select('*').eq('id', receiptId).single(),
      supabase.from('receipt_items').select('*').eq('receipt_id', receiptId).order('created_at'),
    ]);
    setReceipt(receiptData);
    setItems(itemsData ?? []);
    setLoading(false);
    if (receiptData?.image_path) {
      getReceiptImageUrl(receiptData.image_path).then(setImageUrl);
    }
  }

  function openEdit(item: ReceiptItemRecord) {
    setEditingItem(item);
    setEditName(item.cleaned_name);
    setEditPrice(item.price.toFixed(2));
    setEditCategory(item.category_name);
  }

  async function applyEdit() {
    if (!editingItem) return;
    const parsedPrice = Number(editPrice.replace(',', '.'));
    const error = await updateReceiptItem(editingItem.id, {
      cleaned_name: editName.trim() || editingItem.cleaned_name,
      price: Number.isFinite(parsedPrice) ? parsedPrice : editingItem.price,
      category_name: editCategory,
    });
    if (error) {
      Alert.alert('Не удалось сохранить', error);
      return;
    }
    setEditingItem(null);
    await load();
  }

  async function handleDeleteItem(item: ReceiptItemRecord) {
    const error = await deleteReceiptItem(item.id);
    if (error) {
      Alert.alert('Не удалось удалить товар', error);
      return;
    }
    await load();
  }

  function confirmDeleteReceipt() {
    Alert.alert('Удалить чек?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: handleDeleteReceipt },
    ]);
  }

  async function handleDeleteReceipt() {
    if (!receipt) return;
    setSaving(true);
    const error = await deleteReceipt(receipt.id, receipt.image_path);
    setSaving(false);
    if (error) {
      Alert.alert('Не удалось удалить чек', error);
      return;
    }
    navigation.goBack();
  }

  function confirmRescan() {
    Alert.alert(
      'Перезаписать чек?',
      'Фото будет распознано заново. Текущие товары чека заменятся распознанными.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Перезаписать', onPress: handleRescan },
      ],
    );
  }

  async function handleRescan() {
    if (!receipt?.image_path) return;
    setRescanning(true);
    const { error } = await rescanReceipt(receipt);
    setRescanning(false);
    if (error) {
      Alert.alert('Не удалось перезаписать', error);
      return;
    }
    // Обработка идёт в фоне: перечитываем чек — статус станет «Обрабатывается»,
    // товары обновятся при следующем открытии/обновлении экрана.
    await load();
    setEditing(false);
  }

  if (loading || !receipt) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.topTitle}>Чек</Text>
        <Pressable style={styles.editToggle} onPress={() => setEditing((v) => !v)}>
          <Text style={styles.editToggleText}>{editing ? 'Готово' : 'Изменить'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          {imageUrl ? (
            <Pressable onPress={() => setViewerOpen(true)}>
              <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
            </Pressable>
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <ReceiptIcon color={colors.textSecondary} size={22} />
            </View>
          )}
          <View style={styles.summaryInfo}>
            <Text style={styles.storeName}>{receipt.store_name || 'Магазин не распознан'}</Text>
            {receipt.store_address && <Text style={styles.storeAddress}>{receipt.store_address}</Text>}
            <Text style={styles.dateTime}>
              {[receipt.purchase_date, receipt.purchase_time].filter(Boolean).join(' ')}
            </Text>
            <Text style={styles.total}>
              {(receipt.total_amount ?? 0).toFixed(2)} {receipt.currency}
            </Text>
            {receipt.source !== 'manual' && (
              <Text style={[styles.statusText, { color: STATUS_COLOR[receipt.status] }]}>
                {STATUS_LABEL[receipt.status]}
              </Text>
            )}
          </View>
        </View>

        {receipt.status === 'error' && receipt.image_path && !editing && (
          <Pressable style={styles.rescanHint} onPress={confirmRescan} disabled={rescanning}>
            <RotateCw color={colors.accent} size={16} />
            <Text style={styles.rescanHintText}>
              {rescanning ? 'Перезаписываю…' : 'Распознавание не удалось — перезаписать чек'}
            </Text>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>Товары ({items.length})</Text>

        <View style={styles.items}>
          {items.map((item) => {
            return (
              <Pressable
                key={item.id}
                style={[styles.itemRow, item.needs_review && styles.itemRowReview]}
                onPress={() =>
                  editing ? openEdit(item) : navigation.navigate('Product', { productName: item.cleaned_name })
                }
              >
                <CategoryIcon category={item.category_name} itemName={item.cleaned_name} size={36} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.cleaned_name}</Text>
                  <Text style={styles.itemCategory}>
                    {item.category_name}
                    {item.needs_review ? ' · нужно проверить' : ''}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  {item.price.toFixed(2)} {receipt.currency}
                </Text>
                {editing && (
                  <Pressable onPress={() => handleDeleteItem(item)} hitSlop={10} style={styles.deleteItemButton}>
                    <Trash2 color={colors.textSecondary} size={16} />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
          {items.length === 0 && <Text style={styles.emptyText}>Все товары удалены.</Text>}
        </View>

        {editing && (
          <View style={styles.deleteReceiptWrap}>
            {receipt.status === 'error' && receipt.image_path && (
              <PrimaryButton
                label={rescanning ? 'Перезаписываю…' : 'Перезаписать чек'}
                variant="secondary"
                onPress={confirmRescan}
                loading={rescanning}
              />
            )}
            <PrimaryButton
              label="Удалить чек"
              variant="secondary"
              onPress={confirmDeleteReceipt}
              loading={saving}
            />
          </View>
        )}
      </ScrollView>

      <Modal
        visible={editingItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingItem(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setEditingItem(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Редактировать товар</Text>
            <TextField label="Название" value={editName} onChangeText={setEditName} />
            <TextField
              label={`Цена (${receipt.currency})`}
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
            <PrimaryButton label="Сохранить" onPress={applyEdit} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewerOpen(false)}>
          {imageUrl && <Image source={{ uri: imageUrl }} style={styles.viewerImage} resizeMode="contain" />}
          <Pressable style={styles.viewerClose} onPress={() => setViewerOpen(false)}>
            <X color={colors.textPrimary} size={22} />
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
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editToggle: {
    minWidth: 36,
    height: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  editToggleText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  thumbnail: {
    width: 64,
    height: 84,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 84,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '80%',
  },
  viewerClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
  },
  summaryInfo: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    color: colors.textPrimary,
    fontSize: 18,
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
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  rescanHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rescanHintText: {
    flex: 1,
    color: colors.accent,
    fontSize: 13,
    fontWeight: '500',
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
  deleteItemButton: {
    paddingLeft: 8,
  },
  deleteReceiptWrap: {
    marginTop: 8,
    gap: 10,
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
