import { useEffect, useRef, useState } from 'react';
import { Animated, Text, type StyleProp, type TextStyle } from 'react-native';

type Props = {
  value: number;
  formatter?: (n: number) => string;
  duration?: number;
  style?: StyleProp<TextStyle>;
};

// Число «наматывается» до целевого значения (в том числе при первом
// появлении на экране) вместо мгновенного статичного текста — так
// ощущаются суммы в Revolut/Cash App.
export function AnimatedNumber({ value, formatter, duration = 700, style }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, { toValue: value, duration, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const format = formatter ?? ((n: number) => n.toFixed(0));
  return <Text style={style}>{format(display)}</Text>;
}
