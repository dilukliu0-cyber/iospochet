import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { Camera, ChevronRight, LayoutGrid, LogOut, Pencil, Settings, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { TextField } from '../../components/ui/TextField';
import type { AppStackParamList } from '../../navigation/types';
import { avatarUrl, pickAndUploadAvatar } from '../../services/profile/avatarService';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import { getCurrencySymbol } from '../../utils/currencies';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

const LANGUAGE_LABEL: Record<string, string> = { ru: 'Русский', cs: 'Čeština', en: 'English' };

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

  const rootNavigation = () => navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  const userId = session?.user.id ?? '';
  const nickname = settings?.nickname?.trim() || 'Без имени';
  const avatar = avatarUrl(settings?.avatar_path ?? null, settings?.updated_at);

  const langCurrency = `${LANGUAGE_LABEL[settings?.language ?? 'ru'] ?? 'Русский'} · ${getCurrencySymbol(
    settings?.currency ?? 'CZK',
  )}`;

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

  const rows = [
    { icon: LayoutGrid, label: 'Категории', onPress: () => rootNavigation()?.navigate('Categories') },
    { icon: Settings, label: 'Настройки', value: langCurrency, onPress: () => rootNavigation()?.navigate('Settings') },
    { icon: Users, label: 'Семейный аккаунт', onPress: () => rootNavigation()?.navigate('Family') },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
    >
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

      <Text style={styles.sectionTitle}>Аккаунт и настройки</Text>
      <View style={styles.menu}>
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <Pressable key={row.label} style={styles.menuRow} onPress={row.onPress}>
              <View style={styles.menuIcon}>
                <Icon color={colors.accent} size={18} />
              </View>
              <Text style={styles.menuLabel}>{row.label}</Text>
              {row.value && <Text style={styles.menuValue}>{row.value}</Text>}
              <ChevronRight color={colors.textTertiary} size={18} />
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.logoutRow} onPress={signOut}>
        <LogOut color={colors.error} size={18} />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </Pressable>

      <Pressable style={styles.idRow} onPress={copyId}>
        <Text style={styles.idLabel}>Ваш ID (нажмите, чтобы скопировать)</Text>
        <Text style={styles.idValue}>{userId}</Text>
      </Pressable>

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
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
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
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 10,
  },
  menu: {
    gap: 8,
    marginBottom: 24,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  menuValue: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  logoutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
  idRow: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
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
