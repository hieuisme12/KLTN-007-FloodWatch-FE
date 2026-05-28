import { StyleSheet } from 'react-native';

/** Layout header cong dùng chung Trang chủ / Báo cáo / Tài khoản */
export const curvedTabScreen = {
  headerPaddingBottom: 52,
  headerPaddingHorizontal: 20,
  bodyOverlap: -40,
  bodyRadius: 42
};

export const curvedHeaderText = StyleSheet.create({
  topTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700'
  },
  cardLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 6,
    fontWeight: '500'
  },
  cardValue: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff'
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)'
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  }
});

export function curvedBodySection(backgroundColor: string) {
  return {
    flex: 1,
    marginTop: curvedTabScreen.bodyOverlap,
    borderTopLeftRadius: curvedTabScreen.bodyRadius,
    borderTopRightRadius: curvedTabScreen.bodyRadius,
    backgroundColor,
    overflow: 'hidden' as const
  };
}
