import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TAB_BUBBLE_SIZE = 70;
export const TAB_BUBBLE_TOP = 0.3;
export const TAB_BAR_TOP = 15;
export const TAB_BAR_HEIGHT = 85;
export const TAB_NOTCH_PAD = TAB_BUBBLE_SIZE / 2 + 10;
export const TAB_SVG_OVERHANG = TAB_NOTCH_PAD - TAB_BAR_TOP;

/** Chiều cao phần tương tác tab bar (bubble + thanh trắng), chưa gồm home indicator */
export const TAB_BAR_STAGE_HEIGHT = TAB_BAR_TOP + TAB_BAR_HEIGHT + TAB_SVG_OVERHANG;

/** Vùng nối card trắng — chỉ màn Tìm đường (`MapSheetNavBridge`) */
export const MAP_SHEET_BRIDGE_HEIGHT = TAB_BAR_STAGE_HEIGHT;

/** Màn Tìm đường: chừa đủ chỗ cho nav + vùng bridge card */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_STAGE_HEIGHT + insets.bottom;
}

/** Các tab khác: né bubble + thanh nav, không chừa vùng bridge */
export function useTabBarContentInset(): number {
  const insets = useSafeAreaInsets();
  const bubbleClearance =
    TAB_BAR_STAGE_HEIGHT - TAB_SVG_OVERHANG - TAB_BUBBLE_TOP;
  return bubbleClearance + insets.bottom;
}
