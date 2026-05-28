import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { MapCrowdReport, MapSensor } from '../lib/mapApi';
import { colors } from '../theme';

type Props = {
  sensors: MapSensor[];
  reports: MapCrowdReport[];
};

export default function FloodMap(_: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Bản đồ native chưa hỗ trợ trên web</Text>
        <Text style={styles.bannerDesc}>
          Dữ liệu vẫn được tải. Mở trên Android/iOS để xem bản đồ chi tiết với marker.
        </Text>
      </View>
    </View>
  );
}

export function MapLoadingOverlay() {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Đang tải bản đồ…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#eef2f7',
    padding: 16,
    gap: 12
  },
  banner: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12
  },
  bannerTitle: {
    color: '#9a3412',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4
  },
  bannerDesc: {
    color: '#7c2d12',
    fontSize: 13
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(240,249,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: { color: colors.textMuted, fontSize: 14 }
});
