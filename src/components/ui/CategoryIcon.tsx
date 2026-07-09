import { StyleSheet, View } from 'react-native';
import { getCategoryColor } from '../../theme/colors';
import { CATEGORY_ICON_BY_NAME } from '../../utils/categoryIconMap';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { themedStyles } from '../../theme/themedStyles';

type Props = {
  category: string;
  size?: number;
  iconName?: string;
  color?: string;
};

// Иконка категории в цветном скруглённом квадрате (цвет — фирменный для категории).
export function CategoryIcon({ category, size = 40, iconName, color }: Props) {
  const Icon = getCategoryIcon(iconName ?? CATEGORY_ICON_BY_NAME[category] ?? 'ellipsis');
  const tint = color ?? getCategoryColor(category);

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: `${tint}22` },
      ]}
    >
      <Icon color={tint} size={size * 0.5} />
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
