import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SelectableRow } from '../../components/ui/SelectableRow';
import type { AppStackParamList } from '../../navigation/types';
import { supabase } from '../../services/api/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { CURRENCIES } from '../../utils/currencies';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'cs', label: 'Čeština' },
  { code: 'en', label: 'English' },
];

type Props = NativeStackScreenProps<AppStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const signOut = useAuthStore((state) => state.signOut);
  const [deleting, setDeleting] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState('');
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const visibleCurrencies = useMemo(() => {
    const q = currencyQuery.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase() === q,
    );
  }, [currencyQuery]);

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
      <View style={styles.topBar}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.topTitle}>Настройки</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Тема</Text>
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

        <Text style={styles.sectionTitle}>Язык</Text>
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

        <Text style={styles.sectionTitle}>Основная валюта</Text>
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

        <Text style={styles.sectionTitle}>Вид диаграммы в «Расходах»</Text>
        <View style={styles.list}>
          <SelectableRow
            label="Кольцевая"
            selected={(settings?.chart_style ?? 'donut') === 'donut'}
            onPress={() => updateSettings({ chart_style: 'donut' })}
          />
          <SelectableRow
            label="Столбчатая"
            selected={settings?.chart_style === 'bars'}
            onPress={() => updateSettings({ chart_style: 'bars' })}
          />
        </View>

        <Text style={styles.sectionTitle}>Уведомления и ИИ</Text>
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

        <PrimaryButton
          label="Удалить аккаунт и все данные"
          variant="secondary"
          onPress={handleDeleteAccount}
          loading={deleting}
        />
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
    gap: 12,
    paddingBottom: 48,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  list: {
    gap: 8,
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
}));
