import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type Props = TextInputProps & {
  label: string;
};

export function TextField({ label, style, ...inputProps }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.textPrimary,
    fontSize: 16,
  },
}));
