import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, ClipboardList, Play, Plus, ShoppingCart, Sparkles, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Pills } from '../../components/ui/Pills';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import type { AppStackParamList } from '../../navigation/types';
import { supabase } from '../../services/api/supabaseClient';
import {
  deleteTemplate,
  fetchShoppingInsight,
  fetchSmartShopping,
  fetchTemplates,
  type RunningOutItem,
  type ShoppingTemplate,
  type SuggestionItem,
} from '../../services/shopping/smartShopping';
import { useAuthStore } from '../../store/authStore';
import { useShoppingListStore } from '../../store/shoppingListStore';
import { useToastStore } from '../../store/toastStore';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';
import type { ShoppingListItem } from '../../types/shoppingList';

type Mode = 'my' | 'smart' | 'templates';

const FORGOTTEN_AFTER_DAYS = 7;

function daysLeftLabel(days: number): string {
  if (days <= 0) return 'уже пора купить';
  if (days === 1) return '≈ закончится завтра';
  if (days < 5) return `≈ закончится через ${days} дня`;
  if (days <= 7) return `≈ закончится через ${days} дней`;
  return '≈ закончится через неделю+';
}

export function ShoppingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const userId = useAuthStore((state) => state.session?.user.id);
  const items = useShoppingListStore((state) => state.items);
  const init = useShoppingListStore((state) => state.init);
  const addItem = useShoppingListStore((state) => state.addItem);
  const toggleItem = useShoppingListStore((state) => state.toggleItem);
  const deleteItem = useShoppingListStore((state) => state.deleteItem);
  const showToast = useToastStore((state) => state.show);

  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('my');
  const [runningOut, setRunningOut] = useState<RunningOutItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [smartLoaded, setSmartLoaded] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [templates, setTemplates] = useState<ShoppingTemplate[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (userId) init(userId);
      // Шаблоны создаются на отдельном экране — подхватываем изменения при возврате.
      if (userId && mode === 'templates') loadTemplates();
    }, [userId, init, mode]),
  );

  const inList = useCallback(
    (name: string) => items.some((i) => i.text.trim().toLowerCase() === name.trim().toLowerCase()),
    [items],
  );

  async function loadSmart() {
    if (!userId) return;
    const { runningOut: ro, suggestions: sug } = await fetchSmartShopping(userId);
    setRunningOut(ro);
    setSuggestions(sug);
    setSmartLoaded(true);

    if (ro.length > 0 || sug.length > 0) {
      setInsightLoading(true);
      const message = await fetchShoppingInsight(ro, sug);
      setInsight(message);
      setInsightLoading(false);
    }
  }

  async function loadTemplates() {
    if (!userId) return;
    setTemplates(await fetchTemplates(userId));
  }

  function switchMode(next: Mode) {
    setMode(next);
    if (next === 'smart') loadSmart();
    if (next === 'templates') loadTemplates();
  }

  async function handleAdd() {
    if (!text.trim()) return;
    await addItem(text);
    setText('');
  }

  async function addName(name: string) {
    if (inList(name)) return;
    await addItem(name);
  }

  async function addAllSuggestions() {
    const toAdd = [...runningOut.map((r) => r.name), ...suggestions.map((s) => s.name)].filter(
      (name, i, arr) => arr.indexOf(name) === i && !inList(name),
    );
    for (const name of toAdd) await addItem(name);
    if (toAdd.length > 0) showToast(`Добавлено в список: ${toAdd.length}`);
  }

  // «Кажется, ты не купил X» — самый старый неотмеченный пункт старше 7 дней.
  const forgotten = items.find(
    (item) =>
      !item.checked &&
      Date.now() - new Date(item.created_at).getTime() > FORGOTTEN_AFTER_DAYS * 86400000,
  );

  async function keepForgotten(item: ShoppingListItem) {
    // «Да, оставить» — сбрасываем возраст пункта, чтобы не спрашивать ещё неделю.
    await supabase.from('shopping_list_items').update({ created_at: new Date().toISOString() }).eq('id', item.id);
    if (userId) init(userId);
  }

  async function applyTemplate(template: ShoppingTemplate) {
    const toAdd = template.items.filter((i) => !inList(i.text));
    for (const item of toAdd) await addItem(item.text);
    showToast(
      toAdd.length > 0 ? `«${template.name}»: добавлено ${toAdd.length}` : 'Всё из шаблона уже в списке',
    );
    setMode('my');
  }

  function confirmDeleteTemplate(template: ShoppingTemplate) {
    Alert.alert(`Удалить шаблон «${template.name}»?`, '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplate(template.id);
          loadTemplates();
        },
      },
    ]);
  }

  const pending = items.filter((item) => !item.checked);
  const checked = items.filter((item) => item.checked);

  function renderItem({ item }: { item: ShoppingListItem }) {
    return (
      <View style={styles.itemRow}>
        <Pressable
          style={[styles.checkbox, item.checked && styles.checkboxChecked]}
          onPress={() => toggleItem(item.id, !item.checked)}
        >
          {item.checked && <Check color={colors.background} size={14} />}
        </Pressable>
        <Text style={[styles.itemText, item.checked && styles.itemTextChecked]}>{item.text}</Text>
        <Pressable onPress={() => deleteItem(item.id)} hitSlop={8}>
          <Trash2 color={colors.textSecondary} size={16} />
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <ShoppingCart color={colors.accent} size={24} />
        </View>
        <Text style={styles.title}>Покупки</Text>
      </View>

      <View style={styles.pillsWrap}>
        <Pills
          value={mode}
          onChange={(v) => switchMode(v)}
          options={[
            { value: 'my', label: 'Список' },
            { value: 'smart', label: 'Умный' },
            { value: 'templates', label: 'Шаблоны' },
          ]}
        />
      </View>

      {mode === 'my' && (
        <>
          <FlatList
            data={[...pending, ...checked]}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              forgotten ? (
                <View style={styles.forgotCard}>
                  <Text style={styles.forgotText}>
                    Кажется, ты давно не покупал «{forgotten.text}». Оставить в списке?
                  </Text>
                  <View style={styles.forgotActions}>
                    <Pressable style={styles.forgotYes} onPress={() => keepForgotten(forgotten)}>
                      <Text style={styles.forgotYesText}>Да</Text>
                    </Pressable>
                    <Pressable style={styles.forgotNo} onPress={() => deleteItem(forgotten.id)}>
                      <Text style={styles.forgotNoText}>Нет, убрать</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Список пуст. Добавьте товар ниже или загляните в «Умный» — там рекомендации по вашим чекам.
              </Text>
            }
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Добавить товар..."
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <Pressable style={styles.addButton} onPress={handleAdd}>
              <Plus color={colors.background} size={20} />
            </Pressable>
          </View>
        </>
      )}

      {mode === 'smart' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          {(insightLoading || insight) && (
            <View style={styles.aiCard}>
              <View style={styles.aiCardHeader}>
                <Sparkles color={colors.accent} size={16} />
                <Text style={styles.aiCardTitle}>ИИ проанализировал ваши покупки</Text>
              </View>
              {insightLoading ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Text style={styles.aiCardText}>{insight}</Text>
              )}
            </View>
          )}

          {runningOut.length > 0 && (
            <View style={styles.smartSection}>
              <Text style={styles.smartTitle}>Скоро закончится</Text>
              <Text style={styles.smartSub}>Прогноз по интервалам ваших покупок.</Text>
              {runningOut.map((item) => (
                <Pressable
                  key={item.name}
                  style={styles.itemRow}
                  onPress={() => addName(item.name)}
                  disabled={inList(item.name)}
                >
                  <View style={styles.suggestPlus}>
                    {inList(item.name) ? (
                      <Check color={colors.accent} size={16} />
                    ) : (
                      <Plus color={colors.accent} size={16} />
                    )}
                  </View>
                  <View style={styles.runOutInfo}>
                    <Text style={styles.itemText}>{item.name}</Text>
                    <Text style={styles.runOutDays}>{daysLeftLabel(item.daysLeft)}</Text>
                  </View>
                  <Text style={styles.suggestCount}>{item.purchases}×</Text>
                </Pressable>
              ))}
            </View>
          )}

          {suggestions.length > 0 && (
            <View style={styles.smartSection}>
              <Text style={styles.smartTitle}>Вы покупаете регулярно</Text>
              <Text style={styles.smartSub}>Нажмите, чтобы добавить в список.</Text>
              {suggestions
                .filter((s) => !runningOut.some((r) => r.name === s.name))
                .map((item) => (
                  <Pressable
                    key={item.name}
                    style={styles.itemRow}
                    onPress={() => addName(item.name)}
                    disabled={inList(item.name)}
                  >
                    <View style={styles.suggestPlus}>
                      {inList(item.name) ? (
                        <Check color={colors.accent} size={16} />
                      ) : (
                        <Plus color={colors.accent} size={16} />
                      )}
                    </View>
                    <Text style={styles.itemText}>{item.name}</Text>
                    <Text style={styles.suggestCount}>{item.count}×</Text>
                  </Pressable>
                ))}
            </View>
          )}

          {(runningOut.length > 0 || suggestions.length > 0) && (
            <PrimaryButton label="Добавить всё в список" onPress={addAllSuggestions} />
          )}

          {smartLoaded && runningOut.length === 0 && suggestions.length === 0 && (
            <View style={styles.smartEmpty}>
              <Sparkles color={colors.textSecondary} size={28} />
              <Text style={styles.emptyText}>
                Пока мало данных для рекомендаций. Отсканируйте несколько чеков — и здесь появятся частые покупки и
                прогноз «скоро закончится».
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {mode === 'templates' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Pressable style={styles.createTemplateRow} onPress={() => navigation.navigate('NewTemplate')}>
            <View style={styles.suggestPlus}>
              <ClipboardList color={colors.accent} size={16} />
            </View>
            <Text style={styles.itemText}>Создать новый шаблон</Text>
            <Plus color={colors.accent} size={18} />
          </Pressable>

          {templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateSub} numberOfLines={2}>
                  {template.items.length > 0
                    ? template.items.map((i) => i.text).join(', ')
                    : 'Пустой шаблон'}
                </Text>
              </View>
              <Pressable style={styles.templateApply} onPress={() => applyTemplate(template)}>
                <Play color={colors.background} size={14} />
                <Text style={styles.templateApplyText}>Повторить</Text>
              </Pressable>
              <Pressable onPress={() => confirmDeleteTemplate(template)} hitSlop={8}>
                <Trash2 color={colors.textSecondary} size={16} />
              </Pressable>
            </View>
          ))}

          {templates.length === 0 && (
            <Text style={styles.emptyText}>
              Шаблоны — это наборы «Еженедельные покупки», «Для поездки», «Для кота»... Соберите список и сохраните его
              как шаблон, чтобы повторять одним нажатием.
            </Text>
          )}
        </ScrollView>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  pillsWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexGrow: 1,
    paddingBottom: 24,
  },
  forgotCard: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 4,
  },
  forgotText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
  },
  forgotActions: {
    flexDirection: 'row',
    gap: 10,
  },
  forgotYes: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  forgotYesText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '600',
  },
  forgotNo: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  forgotNoText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  aiCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    marginBottom: 14,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiCardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  aiCardText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  smartSection: {
    gap: 8,
    marginBottom: 12,
  },
  smartTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  smartSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 2,
  },
  smartEmpty: {
    alignItems: 'center',
    gap: 10,
    marginTop: 30,
  },
  runOutInfo: {
    flex: 1,
  },
  runOutDays: {
    color: colors.warning,
    fontSize: 12,
    marginTop: 2,
  },
  suggestPlus: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestCount: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  createTemplateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    padding: 14,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  templateSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  templateApply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  templateApplyText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
  },
  itemText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  itemTextChecked: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
