import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_STAGE_HEIGHT,
  TAB_BAR_TOP,
  TAB_BUBBLE_SIZE,
  TAB_BUBBLE_TOP,
  TAB_NOTCH_PAD,
  TAB_SVG_OVERHANG
} from '../constants/tabBarLayout';
import { tabGradient } from '../theme';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Mask,
  Path,
  Rect,
  Stop
} from 'react-native-svg';
import HouseIcon from './HouseIcon';
import MapPinnedIcon from './MapPinnedIcon';
import NotepadTextIcon from './NotepadTextIcon';

const BUBBLE_SIZE = TAB_BUBBLE_SIZE;
const BUBBLE_R = BUBBLE_SIZE / 2;
const BUBBLE_TOP = TAB_BUBBLE_TOP;
const BAR_TOP = TAB_BAR_TOP;
const BAR_HEIGHT = TAB_BAR_HEIGHT;
const NOTCH_PAD = TAB_NOTCH_PAD;
const SVG_BAR_H = BAR_HEIGHT + NOTCH_PAD;
const SVG_OVERHANG = TAB_SVG_OVERHANG;
const BAR_COLOR = '#ffffff';
/** Màu nền phía sau tab bar (Trang chủ / Bản đồ) — lộ trong khuyết */
const INACTIVE_ICON = '#64748b';
const GRADIENT_TOP = tabGradient.top;
const GRADIENT_BOTTOM = tabGradient.bottom;

/** Mép trên thanh trắng trong hệ tọa độ SVG (top SVG = 0) */
const BAR_EDGE_Y = NOTCH_PAD;

/** Tâm khuyết = tâm bubble trong hệ tọa độ SVG (top SVG = 0) */
function notchCenterY(): number {
  return SVG_OVERHANG + BUBBLE_TOP + BUBBLE_R;
}

function buildBarOuterPath(width: number, svgHeight: number): string {
  if (width < 48) return '';

  const y0 = BAR_EDGE_Y;
  const corner = Math.min(22, width * 0.06);

  return [
    `M 0 ${svgHeight}`,
    `L 0 ${y0 + corner}`,
    `Q 0 ${y0} ${corner} ${y0}`,
    `H ${width - corner}`,
    `Q ${width} ${y0} ${width} ${y0 + corner}`,
    `V ${svgHeight}`,
    'Z'
  ].join(' ');
}

function TabIcon({
  routeName,
  color,
  size
}: {
  routeName: string;
  color: string;
  size: number;
}) {
  switch (routeName) {
    case 'index':
      return <HouseIcon size={size} color={color} strokeWidth={2.2} />;
    case 'map':
      return <MapPinnedIcon size={size} color={color} strokeWidth={2.2} />;
    case 'reports':
      return <NotepadTextIcon size={size} color={color} strokeWidth={2.2} />;
    case 'profile':
      return <Ionicons name="person-outline" size={size} color={color} />;
    default:
      return <Ionicons name="ellipse-outline" size={size} color={color} />;
  }
}

function ActiveBubble({ routeName }: { routeName: string }) {
  return (
    <View style={styles.bubbleInner}>
      <Svg width={BUBBLE_SIZE} height={BUBBLE_SIZE}>
        <Defs>
          <LinearGradient id="tabBubbleGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={GRADIENT_TOP} />
            <Stop offset="1" stopColor={GRADIENT_BOTTOM} />
          </LinearGradient>
        </Defs>
        <Circle cx={BUBBLE_R} cy={BUBBLE_R} r={BUBBLE_R} fill="url(#tabBubbleGrad)" />
      </Svg>
      <View style={styles.bubbleIcon}>
        <TabIcon routeName={routeName} color="#ffffff" size={22} />
      </View>
    </View>
  );
}

export default function FloatingCurvedTabBar({
  state,
  navigation
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [notchCenterX, setNotchCenterX] = useState(0);
  const slide = useRef(new Animated.Value(state.index)).current;
  const slideJs = useRef(new Animated.Value(state.index)).current;

  const tabCount = state.routes.length;
  const tabWidth = layoutWidth > 0 ? layoutWidth / tabCount : 0;
  const stageHeight = TAB_BAR_STAGE_HEIGHT;
  const barSvgTop = 0;
  const contentTop = SVG_OVERHANG;
  const safeBottom = insets.bottom;

  const tabIndexes = useMemo(
    () => state.routes.map((_, index) => index),
    [state.routes]
  );

  const bubbleLeftPositions = useMemo(() => {
    if (tabWidth <= 0) return [0];
    return state.routes.map((_, index) => index * tabWidth + tabWidth / 2 - BUBBLE_R);
  }, [state.routes, tabWidth]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, {
        toValue: state.index,
        useNativeDriver: true,
        tension: 68,
        friction: 11
      }),
      Animated.spring(slideJs, {
        toValue: state.index,
        useNativeDriver: false,
        tension: 68,
        friction: 11
      })
    ]).start();
  }, [slide, slideJs, state.index]);

  useEffect(() => {
    if (tabWidth <= 0 || layoutWidth <= 0) return undefined;

    const applyPath = (index: number) => {
      setNotchCenterX(tabWidth * index + tabWidth / 2);
    };

    applyPath(state.index);

    const listenerId = slideJs.addListener(({ value }) => {
      applyPath(value);
    });

    return () => slideJs.removeListener(listenerId);
  }, [layoutWidth, slideJs, state.index, tabWidth]);

  const bubbleX = useMemo(() => {
    if (tabWidth <= 0) return null;
    return slide.interpolate({
      inputRange: tabIndexes,
      outputRange: bubbleLeftPositions
    });
  }, [bubbleLeftPositions, slide, tabIndexes, tabWidth]);

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setLayoutWidth(w);
  }

  const activeRoute = state.routes[state.index]?.name ?? 'index';
  const isMapRoute = activeRoute === 'map';
  const showBar = layoutWidth > 48;
  const barOuterPath = showBar ? buildBarOuterPath(layoutWidth, SVG_BAR_H) : '';
  const holeR = BUBBLE_R + 6;
  const notchCy = notchCenterY();

  return (
    <View
      style={[
        styles.root,
        safeBottom > 0 && {
          paddingBottom: safeBottom,
          marginBottom: -safeBottom
        }
      ]}
    >
      {safeBottom > 0 ? (
        <View style={[styles.safeBottomFill, { height: safeBottom }]} pointerEvents="none" />
      ) : null}
      <View style={[styles.stage, { height: stageHeight }]} onLayout={onLayout}>
        {isMapRoute && layoutWidth > 0 && bubbleX != null ? (
          <Animated.View
            style={[
              styles.notchFill,
              {
                top: contentTop + BUBBLE_TOP,
                transform: [{ translateX: bubbleX }]
              }
            ]}
            pointerEvents="none"
          />
        ) : null}

        {showBar ? (
          <Svg
            width={layoutWidth}
            height={SVG_BAR_H}
            style={[styles.barSvg, { top: barSvgTop }]}
          >
            <Defs>
              <Mask id="tabBarNotchMask" x={0} y={0} width={layoutWidth} height={SVG_BAR_H}>
                <Path d={barOuterPath} fill="#fff" />
                <Circle
                  cx={notchCenterX}
                  cy={notchCy}
                  r={holeR}
                  fill="#000"
                />
              </Mask>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={layoutWidth}
              height={SVG_BAR_H}
              fill={BAR_COLOR}
              mask="url(#tabBarNotchMask)"
            />
          </Svg>
        ) : (
          <View style={[styles.barFallback, { top: contentTop + BAR_TOP }]} />
        )}

        <View style={[styles.iconRow, { top: contentTop + BAR_TOP }]}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            return (
              <Pressable
                key={route.key}
                style={styles.tabSlot}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }}
                onLongPress={() => {
                  navigation.emit({ type: 'tabLongPress', target: route.key });
                }}
              >
                {focused ? (
                  <View style={styles.iconPlaceholder} />
                ) : (
                  <TabIcon routeName={route.name} color={INACTIVE_ICON} size={22} />
                )}
              </Pressable>
            );
          })}
        </View>

        {layoutWidth > 0 && bubbleX != null ? (
          <Animated.View
            style={[
              styles.bubble,
              { top: contentTop + BUBBLE_TOP, transform: [{ translateX: bubbleX }] }
            ]}
            pointerEvents="none"
          >
            <ActiveBubble routeName={activeRoute} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent'
  },
  stage: {
    width: '100%',
    position: 'relative',
    overflow: 'visible'
  },
  notchFill: {
    position: 'absolute',
    left: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_R,
    backgroundColor: BAR_COLOR,
    zIndex: 0
  },
  barSvg: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 12
  },
  barFallback: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    backgroundColor: BAR_COLOR,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    zIndex: 1
  },
  iconRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconPlaceholder: {
    width: 22,
    height: 22
  },
  bubble: {
    position: 'absolute',
    left: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    zIndex: 3
  },
  bubbleInner: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_R,
    overflow: 'hidden',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10
  },
  bubbleIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center'
  },
  safeBottomFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BAR_COLOR
  }
});
