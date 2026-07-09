import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type Props = {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
};

export function SelectableRow({ label, sublabel, selected, onPress }: Props) {
  return (
    <Pressable style={[styles.row, selected && styles.rowSelected]} onPress={onPress}>
      <View>
        <Text style={styles.label}>{label}</Text>
        {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
      {selected && <Check color={colors.accent} size={20} />}
    </Pressable>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowSelected: {
    borderColor: colors.accent,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  sublabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
}));
