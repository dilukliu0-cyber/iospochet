import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, progressColor } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type Props = {
  percent: number;
  color?: string;
  height?: number;
  trackColor?: string;
};

// Прогресс-бар, который плавно заполняется при появлении.
export function AnimatedProgressBar({ percent, color, height = 8, trackColor }: Props) {
  const width = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(percent, 100));

  useEffect(() => {
    Animated.timing(width, {
      toValue: clamped,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [clamped, width]);

  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor ?? colors.surfaceElevated }]}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? progressColor(clamped),
          width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
}));
