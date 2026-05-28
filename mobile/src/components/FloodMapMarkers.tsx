import { StyleSheet, Text, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';
import type { MapSensor } from '../lib/mapApi';
import { SENSOR_MARKER_COLORS } from '../lib/mapColors';
import { colors } from '../theme';
import MapPinIcon from './MapPinIcon';
import RadarIcon from './RadarIcon';

export const SENSOR_STATUS_LABEL_VI: Record<MapSensor['status'], string> = {
  normal: 'Bình thường',
  warning: 'Cảnh báo',
  elevated: 'Nâng cao',
  danger: 'Nguy hiểm',
  critical: 'Nghiêm trọng',
  offline: 'Mất kết nối'
};

type GpsCoords = { latitude: number; longitude: number };

export function MapUserGpsMarker({ coords }: { coords: GpsCoords | null }) {
  if (!coords) return null;
  return (
    <Marker
      key="user-gps"
      coordinate={coords}
      anchor={{ x: 0.5, y: 0.95 }}
      title="Vị trí của bạn"
      tracksViewChanges={false}
    >
      <View style={styles.gpsIconWrap}>
        <MapPinIcon size={28} color="#0ea5e9" strokeWidth={2.1} />
      </View>
    </Marker>
  );
}

export function MapSensorMarkers({
  sensors,
  keyPrefix = 'sensor'
}: {
  sensors: MapSensor[];
  keyPrefix?: string;
}) {
  return (
    <>
      {sensors.map((s) => (
        <Marker
          key={`${keyPrefix}-${s.sensor_id}`}
          coordinate={{ latitude: s.lat, longitude: s.lng }}
          anchor={{ x: 0.5, y: 0.95 }}
          title={s.location_name}
          description={`${s.water_level.toFixed(1)} cm · ${SENSOR_STATUS_LABEL_VI[s.status]}`}
          tracksViewChanges={false}
        >
          <View style={styles.sensorIconFrame}>
            <View
              style={[styles.sensorIconBg, { backgroundColor: SENSOR_MARKER_COLORS[s.status] }]}
            >
              <RadarIcon size={18} color="#111111" strokeWidth={2.1} />
            </View>
          </View>
          <Callout>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{s.location_name}</Text>
              <Text style={styles.calloutMeta}>Mực nước: {s.water_level.toFixed(1)} cm</Text>
              <Text style={styles.calloutMeta}>
                Trạng thái: {SENSOR_STATUS_LABEL_VI[s.status]}
              </Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  gpsIconWrap: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2.5 },
    elevation: 5
  },
  sensorIconFrame: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2.5 },
    elevation: 5
  },
  sensorIconBg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)'
  },
  callout: { minWidth: 160, maxWidth: 240 },
  calloutTitle: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  calloutMeta: { fontSize: 13, color: colors.textMuted }
});
