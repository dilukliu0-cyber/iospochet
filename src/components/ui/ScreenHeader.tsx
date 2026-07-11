import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type Props = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  center?: ReactNode;
};

export function ScreenHeader({ title, onBack, right, center }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.side}>
        {onBack && (
          <Pressable style={styles.iconButton} onPress={onBack} hitSlop={8}>
            <ArrowLeft color={colors.textPrimary} size={22} />
          </Pressable>
        )}
      </View>
      {center ?? <Text style={styles.title}>{title}</Text>}
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  side: {
    minWidth: 40,
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
}));
