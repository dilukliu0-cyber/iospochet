import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, Camera, LogOut, Pencil } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SelectableRow } from '../../components/ui/SelectableRow';
import { TextField } from '../../components/ui/TextField';
import type { AppStackParamList } from '../../navigation/types';
import { supabase } from '../../services/api/supabaseClient';
import { avatarUrl, pickAndUploadAvatar } from '../../services/profile/avatarService';
import { sendTestNotification } from '../../services/notifications/pushNotifications';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import { CURRENCIES } from '../../utils/currencies';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'cs', label: 'Čeština' },
  { code: 'en', label: 'English' },
];

// Один экран вместо двух: раньше «Профиль» (ник/аватарка/ID) и «Настройки»
// (тема/язык/валюта/...) жили отдельно — теперь всё здесь, попадают сюда
// через единственный пункт «Настройка профиля» в рулетке аватарки.
export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const showToast = useToastStore((state) => state.show);

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState('');
  const [currencyOpen, setCurrencyOpen] = useState(false);

  // Профиль лежит в корневом стеке (не во вкладках), поэтому родителя может
  // не быть — тогда навигируем через собственный navigation.
  const rootNavigation = () => navigation.getParent<NativeStackNavigationProp<AppStackParamList>>() ?? navigation;
  const userId = session?.user.id ?? '';
  const nickname = settings?.nickname?.trim() || 'Без имени';
  const avatar = avatarUrl(settings?.avatar_path ?? null, settings?.updated_at);

  const visibleCurrencies = useMemo(() => {
    const q = currencyQuery.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase() === q,
    );
  }, [currencyQuery]);

  async function handlePickAvatar() {
    if (!userId || uploadingAvatar) return;
    setUploadingAvatar(true);
    const { path, error } = await pickAndUploadAvatar(userId);
    if (path) {
      await updateSettings({ avatar_path: path });
      showToast('Аватарка обновлена');
    } else if (error) {
      Alert.alert('Не удалось загрузить фото', error);
    }
    setUploadingAvatar(false);
  }

  function openNicknameEditor() {
    setNicknameDraft(settings?.nickname ?? '');
    setEditingNickname(true);
  }

  async function saveNickname() {
    const trimmed = nicknameDraft.trim();
    if (!trimmed) {
      Alert.alert('Ник не может быть пустым');
      return;
    }
    await updateSettings({ nickname: trimmed });
    setEditingNickname(false);
  }

  async function copyId() {
    if (!userId) return;
    await Clipboard.setStringAsync(userId);
    showToast('ID скопирован в буфер обмена');
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Удалить аккаунт?',
      'Будут безвозвратно удалены все чеки, фото, лимиты и история чата. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить всё',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
              'delete-account',
            );
            setDeleting(false);
            if (error || !data?.ok) {
              Alert.alert('Не удалось удалить аккаунт', error?.message ?? data?.error ?? 'Попробуйте ещё раз');
              return;
            }
            await signOut();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.topTitle}>Профиль</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.avatarWrap} onPress={handlePickAvatar} disabled={uploadingAvatar}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{nickname[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Camera color={colors.background} size={13} />
            </View>
          </Pressable>
          <Pressable style={styles.nicknameRow} onPress={openNicknameEditor}>
            <Text style={styles.nickname}>{nickname}</Text>
            <Pencil color={colors.textTertiary} size={14} />
          </Pressable>
        </View>

        {/* Категории и Семейный аккаунт уже доступны из рулетки аватарки —
            здесь дублировать их не нужно, остаётся только ID. */}
        <Pressable style={styles.idRow} onPress={copyId}>
          <Text style={styles.idLabel}>Ваш ID (нажмите, чтобы скопировать)</Text>
          <Text style={styles.idValue}>{userId}</Text>
        </Pressable>

        {/* Оформление: тема + язык интерфейса. */}
        <View style={styles.groupCard}>
          <Text style={styles.groupTitle}>Оформление</Text>
          <Text style={styles.subLabel}>Тема</Text>
          <View style={styles.list}>
            <SelectableRow
              label="Тёмная"
              selected={(settings?.theme ?? 'dark') === 'dark'}
              onPress={() => updateSettings({ theme: 'dark' })}
            />
            <SelectableRow
              label="Светлая"
              selected={settings?.theme === 'light'}
              onPress={() => updateSettings({ theme: 'light' })}
            />
          </View>
          <Text style={styles.subLabel}>Язык</Text>
          <View style={styles.list}>
            {LANGUAGES.map((lang) => (
              <SelectableRow
                key={lang.code}
                label={lang.label}
                selected={settings?.language === lang.code}
                onPress={() => updateSettings({ language: lang.code })}
              />
            ))}
          </View>
        </View>

        {/* Деньги: валюта + перевод названий товаров — всё, что касается чеков. */}
        <View style={styles.groupCard}>
          <Text style={styles.groupTitle}>Деньги и товары</Text>
          <Text style={styles.subLabel}>Основная валюта</Text>
          {!currencyOpen ? (
            <Pressable style={styles.currencyRow} onPress={() => setCurrencyOpen(true)}>
              <Text style={styles.currencyValue}>
                {(() => {
                  const cur = CURRENCIES.find((c) => c.code === (settings?.currency ?? 'CZK'));
                  return cur ? `${cur.name} (${cur.symbol}) · ${cur.code}` : settings?.currency ?? 'CZK';
                })()}
              </Text>
              <Text style={styles.currencyChange}>Сменить</Text>
            </Pressable>
          ) : (
            <>
              <TextInput
                style={styles.searchInput}
                value={currencyQuery}
                onChangeText={setCurrencyQuery}
                placeholder="Поиск: название или код (EUR, гривна...)"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              <View style={styles.list}>
                {visibleCurrencies.map((currency) => (
                  <SelectableRow
                    key={currency.code}
                    label={`${currency.name} (${currency.symbol}) · ${currency.code}`}
                    selected={settings?.currency === currency.code}
                    onPress={() => {
                      updateSettings({ currency: currency.code });
                      setCurrencyOpen(false);
                      setCurrencyQuery('');
                    }}
                  />
                ))}
                {visibleCurrencies.length === 0 && <Text style={styles.hint}>Ничего не найдено.</Text>}
              </View>
            </>
          )}
          <Text style={styles.hint}>
            Аналитика считается в основной валюте. Чеки в другой валюте конвертируются по курсу на день покупки.
          </Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleLabel}>Переводить товары</Text>
              <Text style={styles.toggleHint}>
                Названия товаров в чеке будут переведены на выбранный язык (кроме брендов).
              </Text>
            </View>
            <Switch
              value={settings?.translate_items ?? false}
              onValueChange={(value) => updateSettings({ translate_items: value })}
              trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </View>

        {/* Диаграммы: вид на обоих экранах вместе. */}
        <View style={styles.groupCard}>
          <Text style={styles.groupTitle}>Диаграммы</Text>
          <Text style={styles.subLabel}>В «Расходах»</Text>
          <View style={styles.list}>
            <SelectableRow
              label="По категориям (кольцо)"
              selected={(settings?.chart_style ?? 'donut') === 'donut'}
              onPress={() => updateSettings({ chart_style: 'donut' })}
            />
            <SelectableRow
              label="Суммы по категориям (столбцы)"
              selected={settings?.chart_style === 'bars'}
              onPress={() => updateSettings({ chart_style: 'bars' })}
            />
          </View>
          <Text style={styles.subLabel}>На «Главной»</Text>
          <View style={styles.list}>
            <SelectableRow
              label="Динамика расходов (линия)"
              selected={(settings?.home_chart ?? 'line') === 'line'}
              onPress={() => updateSettings({ home_chart: 'line' })}
            />
            <SelectableRow
              label="Расходы по дням (столбцы)"
              selected={settings?.home_chart === 'daily'}
              onPress={() => updateSettings({ home_chart: 'daily' })}
            />
          </View>
        </View>

        {/* Уведомления и ИИ + стартовый гайд — «about the app» блок. */}
        <View style={styles.groupCard}>
          <Text style={styles.groupTitle}>Уведомления и ИИ</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Уведомления</Text>
            <Switch
              value={settings?.notifications_enabled ?? true}
              onValueChange={(value) => updateSettings({ notifications_enabled: value })}
              trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Советы от ИИ</Text>
            <Switch
              value={settings?.ai_tips_enabled ?? true}
              onValueChange={(value) => updateSettings({ ai_tips_enabled: value })}
              trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>
          <Pressable style={styles.currencyRow} onPress={() => sendTestNotification()}>
            <Text style={styles.currencyValue}>Тестовое уведомление</Text>
            <Text style={styles.currencyChange}>Отправить</Text>
          </Pressable>
          <Pressable style={styles.currencyRow} onPress={() => rootNavigation()?.navigate('IntroPreview')}>
            <Text style={styles.currencyValue}>Стартовый гайд</Text>
            <Text style={styles.currencyChange}>Посмотреть</Text>
          </Pressable>
        </View>

        <Pressable style={styles.logoutRow} onPress={signOut}>
          <LogOut color={colors.error} size={18} />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </Pressable>

        <PrimaryButton
          label="Удалить аккаунт и все данные"
          variant="secondary"
          onPress={handleDeleteAccount}
          loading={deleting}
        />
      </ScrollView>

      <Modal
        visible={editingNickname}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingNickname(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setEditingNickname(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Ваш ник</Text>
            <TextField label="Ник" value={nicknameDraft} onChangeText={setNicknameDraft} placeholder="Например, Дима" />
            <PrimaryButton label="Сохранить" onPress={saveNickname} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 12,
  },
  header: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  avatarWrap: {
    width: 76,
    height: 76,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surfaceElevated,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '700',
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nickname: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  // Карточка-«полка»: группирует несколько связанных разделов вместо
  // плоского списка отдельных заголовков — так настройки читаются как
  // несколько понятных блоков, а не разбросанный список.
  groupCard: {
    // Фон карточки = фон страницы (не surface) — иначе строки внутри
    // (тоже surface) сливаются с рамкой и группа перестаёт читаться.
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    gap: 10,
  },
  groupTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  subLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  list: {
    gap: 8,
  },
  idRow: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  idLabel: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  idValue: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currencyValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  currencyChange: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  toggleTextWrap: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  toggleHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  logoutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
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
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
}));
