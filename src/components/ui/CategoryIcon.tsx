import { StyleSheet, View } from 'react-native';
import { getCategoryColor } from '../../theme/colors';
import { CATEGORY_ICON_BY_NAME } from '../../utils/categoryIconMap';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { inferItemIconName } from '../../utils/itemIcons';
import { themedStyles } from '../../theme/themedStyles';

type Props = {
  category: string;
  size?: number;
  iconName?: string;
  color?: string;
  // Название конкретного товара — если задано, иконка подбирается по нему
  // (молоко/сыр/салями вместо одной иконки категории на все товары).
  itemName?: string;
};

// Иконка категории — просто цветная, без квадратной подложки (фирменный
// приглушённый цвет категории на самой иконке даёт достаточно различия,
// а лишний «icon-in-a-box» на каждой строке списка выглядит шаблонно).
export function CategoryIcon({ category, size = 40, iconName, color, itemName }: Props) {
  const inferred = itemName ? inferItemIconName(itemName) : null;
  const Icon = getCategoryIcon(inferred ?? iconName ?? CATEGORY_ICON_BY_NAME[category] ?? 'ellipsis');
  const tint = color ?? getCategoryColor(category);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Icon color={tint} size={size * 0.62} strokeWidth={1.75} />
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
