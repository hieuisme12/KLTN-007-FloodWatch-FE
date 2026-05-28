import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { tabGradient } from '../theme';

type Props = {
  style?: StyleProp<ViewStyle>;
};

/** Nền gradient đồng bộ với bubble nav (#38bdf8 → #1d4ed8) */
export default function TabHeaderGradient({ style }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ width, height });
  }

  return (
    <View style={[styles.fill, style]} onLayout={onLayout} pointerEvents="none">
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id="tabScreenHeaderGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tabGradient.top} />
              <Stop offset="1" stopColor={tabGradient.bottom} />
            </LinearGradient>
          </Defs>
          <Rect width={size.width} height={size.height} fill="url(#tabScreenHeaderGrad)" />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject
  }
});
