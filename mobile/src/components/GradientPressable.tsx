import { useId, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { dangerGradient, tabGradient } from '../theme';

export type GradientVariant = 'blue' | 'red';

type Props = PressableProps & {
  variant?: GradientVariant;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  children: React.ReactNode;
};

function gradientColors(variant: GradientVariant) {
  return variant === 'red' ? dangerGradient : tabGradient;
}

export default function GradientPressable({
  variant = 'blue',
  style,
  borderRadius = 12,
  children,
  disabled,
  ...rest
}: Props) {
  const gradId = useId().replace(/:/g, '');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const colors = gradientColors(variant);
  const radius = Math.min(borderRadius, size.width / 2, size.height / 2 || borderRadius);

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ width, height });
    rest.onLayout?.(e);
  }

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onLayout={onLayout}
      style={({ pressed }) => [
        styles.base,
        { borderRadius },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
    >
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.top} />
              <Stop offset="1" stopColor={colors.bottom} />
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            rx={radius}
            ry={radius}
            fill={`url(#${gradId})`}
          />
        </Svg>
      ) : null}
      <View style={styles.content}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  disabled: {
    opacity: 0.65
  },
  pressed: {
    opacity: 0.92
  }
});
