import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAP_SHEET_BRIDGE_HEIGHT } from '../constants/tabBarLayout';

/** Màu card bottom sheet Tìm đường — chỉ màn map */
export const MAP_SHEET_BG = '#ffffff';

/** Lớp nối card ↔ nav — chỉ dùng tại `app/(tabs)/map.tsx` */
export default function MapSheetNavBridge() {
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      style={[styles.bridge, { height: MAP_SHEET_BRIDGE_HEIGHT, bottom }]}
    />
  );
}

const styles = StyleSheet.create({
  bridge: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: MAP_SHEET_BG,
    zIndex: 1
  }
});
