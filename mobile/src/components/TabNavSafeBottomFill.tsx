import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Nền trắng nav — vùng home indicator dưới thanh tab (ngoài layout tab bar của RN) */
export const TAB_NAV_BG = '#ffffff';

export default function TabNavSafeBottomFill() {
  const { bottom } = useSafeAreaInsets();
  if (bottom < 1) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.fill, { height: bottom }]}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: TAB_NAV_BG,
    zIndex: 0
  }
});
