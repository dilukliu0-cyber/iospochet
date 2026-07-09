import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus, Trash2, Wand2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { TextField } from '../../components/ui/TextField';
import type { AppStackParamList } from '../../navigation/types';
import { createTemplate, suggestTemplateItems } from '../../services/shopping/smartShopping';
import { useAuthStore } from '../../store/authStore';
import { useShoppingListStore } from '../../store/shoppingListStore';
import { useToastStore } from '../../store/toastStore';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type Props = NativeStackScreenProps<AppStackParamList, 'NewTemplate'>;

export function NewTemplateScreen({ navigation }: Props) {
  const userId = useAuthStore((state) => state.session?.user.id);
  // Селектор не должен возвращать новый массив на каждый рендер (Zustand +
  // useSyncExternalStore из-за этого падает) — фильтруем отдельно через useMemo.
  const listItems = useShoppingListStore((state) => state.items);
  const pending = useMemo(() => listItems.filter((i) => !i.checked), [listItems]);
  const showToast = useToastStore((state) => state.show);

  const [name, setName] = useState('');
  // Стартовый набор — то, что уже лежит в обычном списке; дальше можно
  // редактировать вручную или дополнить кнопкой ИИ.
  const [itemsList, setItemsList] = useState<string[]>(() => pending.map((i) => i.text));
  const [draft, setDraft] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);

  function addDraft() {
    const text = draft.trim();
    if (!text) return;
    if (!itemsList.some((i) => i.toLowerCase() === text.toLowerCase())) {
      setItemsList((prev) => [...prev, text]);
    }
    setDraft('');
  }

  function removeItem(text: string) {
    setItemsList((prev) => prev.filter((i) => i !== text));
  }

  async function handleAiSuggest() {
    const trimmed = name.trim();
    if (!trimmed || aiSuggesting) return;
    setAiSuggesting(true);
    const { items: suggested, error } = await suggestTemplateItems(trimmed);
    setAiSuggesting(false);
    if (error) {
      Alert.alert('Не удалось подобрать товары', error);
      return;
    }
    setItemsList((prev) => {
      const existingLower = new Set(prev.map((i) => i.toLowerCase()));
      const toAdd = suggested.filter((i) => !existingLower.has(i.toLowerCase()));
      return [...prev, ...toAdd];
    });
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!userId || !trimmed || saving) return;
    if (itemsList.length === 0) {
      Alert.alert('Список пуст', 'Добавьте товары вручную или нажмите «Заполнить с помощью ИИ».');
      return;
    }
    setSaving(true);
    const error = await createTemplate(userId, trimmed, itemsList);
    setSaving(false);
    if (error) {
      Alert.alert('Не удалось создать шаблон', error);
      return;
    }
    showToast(`Шаблон «${trimmed}» создан`);
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScreenHeader title="Новый шаблон" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField label="Название" value={name} onChangeText={setName} placeholder="Например, Для кота" />

        <Pressable
          style={[styles.aiFillButton, (!name.trim() || aiSuggesting) && styles.aiFillButtonDisabled]}
          onPress={handleAiSuggest}
          disabled={!name.trim() || aiSuggesting}
        >
          {aiSuggesting ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Wand2 color={colors.accent} size={16} />
          )}
          <Text style={styles.aiFillButtonText}>
            {aiSuggesting ? 'Подбираю товары...' : 'Заполнить с помощью ИИ'}
          </Text>
        </Pressable>

        <View style={styles.itemInputRow}>
          <TextInput
            style={styles.itemInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Добавить товар..."
            placeholderTextColor={colors.textSecondary}
            onSubmitEditing={addDraft}
            returnKeyType="done"
          />
          <Pressable style={styles.itemAdd} onPress={addDraft}>
            <Plus color={colors.background} size={18} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Товары ({itemsList.length})</Text>
        <View style={styles.itemsList}>
          {itemsList.map((text) => (
            <View key={text} style={styles.itemChip}>
              <Text style={styles.itemChipText}>{text}</Text>
              <Pressable onPress={() => removeItem(text)} hitSlop={8}>
                <Trash2 color={colors.textSecondary} size={14} />
              </Pressable>
            </View>
          ))}
          {itemsList.length === 0 && (
            <Text style={styles.emptyText}>Добавьте товары вручную или нажмите «Заполнить с помощью ИИ».</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Сохранить шаблон" onPress={handleSave} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  aiFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 12,
  },
  aiFillButtonDisabled: {
    opacity: 0.5,
  },
  aiFillButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  itemInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  itemAdd: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  itemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  itemChipText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
}));
