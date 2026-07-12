import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type DimensionValue } from 'react-native';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type Props = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: object;
};

// Пульсирующая плашка-заглушка вместо спиннера на время первой загрузки —
// сразу показывает форму будущего контента, а не пустой экран.
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { width, height, borderRadius, opacity }, style]} />;
}

const styles = themedStyles(() => StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceElevated,
  },
}));
