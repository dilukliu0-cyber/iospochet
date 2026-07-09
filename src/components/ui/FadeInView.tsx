import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

type Props = {
  children: ReactNode;
  index?: number;
  style?: object;
};

// Появление с fade + лёгким подъёмом снизу. index задаёт каскадную задержку
// для списков (элементы «вплывают» по очереди).
export function FadeInView({ children, index = 0, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 350,
      delay: Math.min(index, 8) * 45,
      useNativeDriver: true,
    }).start();
  }, [progress, index]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
