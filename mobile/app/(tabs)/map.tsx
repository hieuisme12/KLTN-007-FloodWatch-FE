import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MAP_POLL_MS } from '@hcm-flood/shared';
import FloodMap, { MapLoadingOverlay } from '../../src/components/FloodMap';
import {
  fetchMapCrowdReports,
  fetchMapSensors,
  type MapCrowdReport,
  type MapSensor
} from '../../src/lib/mapApi';
import { SENSOR_MARKER_COLORS } from '../../src/lib/mapColors';
import { colors } from '../../src/theme';

export default function MapScreen() {
  const [sensors, setSensors] = useState<MapSensor[]>([]);
  const [reports, setReports] = useState<MapCrowdReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAll = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [sensorRows, reportRows] = await Promise.all([
        fetchMapSensors(),
        fetchMapCrowdReports()
      ]);
      setSensors(sensorRows);
      setReports(reportRows);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu bản đồ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll(true);
    const sensorIv = setInterval(() => {
      fetchMapSensors().then(setSensors).catch(() => {});
    }, MAP_POLL_MS.floodData);
    const reportIv = setInterval(() => {
      fetchMapCrowdReports().then(setReports).catch(() => {});
    }, MAP_POLL_MS.crowdReports);
    return () => {
      clearInterval(sensorIv);
      clearInterval(reportIv);
    };
  }, [loadAll]);

  return (
    <View style={styles.container}>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          Cảm biến: {sensors.length} · Báo cáo: {reports.length}
        </Text>
        {lastUpdated ? (
          <Text style={styles.statsMuted}>
            Cập nhật {lastUpdated.toLocaleTimeString('vi-VN')}
          </Text>
        ) : null}
        <Pressable onPress={() => loadAll(true)} hitSlop={8}>
          <Text style={styles.refreshLink}>Làm mới</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadAll(true)}>
            <Text style={styles.refreshLink}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.mapWrap}>
        <FloodMap sensors={sensors} reports={reports} />
        {loading ? <MapLoadingOverlay /> : null}
      </View>

      <View style={styles.legend}>
        <LegendDot color={SENSOR_MARKER_COLORS.normal} label="Bình thường" />
        <LegendDot color={SENSOR_MARKER_COLORS.warning} label="Cảnh báo" />
        <LegendDot color={SENSOR_MARKER_COLORS.danger} label="Nguy hiểm" />
        <LegendDot color="#0891b2" label="Báo cáo" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  statsText: { fontSize: 13, fontWeight: '600', color: colors.text },
  statsMuted: { fontSize: 12, color: colors.textMuted },
  refreshLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  errorBox: {
    padding: 10,
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca'
  },
  errorText: { fontSize: 13, color: colors.danger },
  mapWrap: { flex: 1 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: colors.textMuted }
});
