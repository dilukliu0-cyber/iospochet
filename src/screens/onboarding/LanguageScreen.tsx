import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SelectableRow } from '../../components/ui/SelectableRow';
import type { OnboardingStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Language'>;

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'cs', label: 'Čeština' },
  { code: 'en', label: 'English' },
];

export function LanguageScreen({ navigation }: Props) {
  const [selected, setSelected] = useState('ru');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Выберите язык</Text>
        <Text style={styles.subtitle}>Язык интерфейса и ответов ИИ.</Text>

        <View style={styles.list}>
          {LANGUAGES.map((lang) => (
            <SelectableRow
              key={lang.code}
              label={lang.label}
              selected={selected === lang.code}
              onPress={() => setSelected(lang.code)}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="Далее" onPress={() => navigation.navigate('Currency', { language: selected })} />
      </View>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    gap: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
  },
  list: {
    gap: 10,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
}));
