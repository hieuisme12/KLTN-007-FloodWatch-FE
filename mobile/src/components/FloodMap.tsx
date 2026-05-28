import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { HCM_MAP_CENTER } from '@hcm-flood/shared';
import type { MapCrowdReport, MapSensor } from '../lib/mapApi';
import { crowdReportColor, SENSOR_MARKER_COLORS } from '../lib/mapColors';
import { getFloodLevelLabel } from '../lib/floodLevels';
import { colors } from '../theme';
import MapPinIcon from './MapPinIcon';
import RadarIcon from './RadarIcon';
import UserRoundCheckIcon from './UserRoundCheckIcon';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';

type Props = {
  sensors: MapSensor[];
  reports: MapCrowdReport[];
  focusTarget?: {
    kind: 'sensor' | 'report';
    id: string;
    lat: number;
    lng: number;
  } | null;
};

const SENSOR_STATUS_LABEL_VI: Record<MapSensor['status'], string> = {
  normal: 'Bình thường',
  warning: 'Cảnh báo',
  elevated: 'Nâng cao',
  danger: 'Nguy hiểm',
  critical: 'Nghiêm trọng',
  offline: 'Mất kết nối'
};

export default function FloodMap({ sensors, reports, focusTarget = null }: Props) {
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setLocError('Chưa cấp quyền vị trí');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        if (!cancelled) {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        }
      } catch {
        if (!cancelled) setLocError('Không lấy được GPS');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const initialRegion = useMemo(
    () => ({
      latitude: userCoords?.latitude ?? HCM_MAP_CENTER.lat,
      longitude: userCoords?.longitude ?? HCM_MAP_CENTER.lng,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12
    }),
    [userCoords]
  );

  const mapboxTileUrl = MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
    : null;

  useEffect(() => {
    if (!focusTarget || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: focusTarget.lat,
        longitude: focusTarget.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      },
      500
    );
  }, [focusTarget]);

  return (
    <View style={styles.wrap}>
      <MapView
        ref={(node) => {
          mapRef.current = node;
        }}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={Platform.OS === 'android'}
        toolbarEnabled={false}
      >
        {mapboxTileUrl ? (
          <UrlTile urlTemplate={mapboxTileUrl} maximumZ={20} flipY={false} />
        ) : null}

        {userCoords ? (
          <Marker
            key="user-gps"
            coordinate={{
              latitude: userCoords.latitude,
              longitude: userCoords.longitude
            }}
            anchor={{ x: 0.5, y: 0.95 }}
            title="Vị trí của bạn"
            tracksViewChanges={false}
          >
            <View style={styles.gpsIconWrap}>
              <MapPinIcon size={28} color="#0ea5e9" strokeWidth={2.1} />
            </View>
          </Marker>
        ) : null}

        {sensors.map((s) => (
          <Marker
            key={`sensor-${s.sensor_id}`}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            anchor={{ x: 0.5, y: 0.95 }}
            title={s.location_name}
            description={`${s.water_level.toFixed(1)} cm · ${SENSOR_STATUS_LABEL_VI[s.status]}`}
            tracksViewChanges={false}
          >
            <View style={styles.sensorIconFrame}>
              <View
                style={[
                  styles.sensorIconBg,
                  { backgroundColor: SENSOR_MARKER_COLORS[s.status] }
                ]}
              >
                <RadarIcon size={18} color="#111111" strokeWidth={2.1} />
              </View>
            </View>
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{s.location_name}</Text>
                <Text style={styles.calloutMeta}>
                  Mực nước: {s.water_level.toFixed(1)} cm
                </Text>
                <Text style={styles.calloutMeta}>
                  Trạng thái: {SENSOR_STATUS_LABEL_VI[s.status]}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {reports.map((r) => (
          <Marker
            key={`report-${r.id}`}
            coordinate={{ latitude: r.lat, longitude: r.lng }}
            anchor={{ x: 0.5, y: 0.95 }}
            title="Báo cáo người dân"
            description={getFloodLevelLabel(r.flood_level) || 'Ngập'}
            tracksViewChanges={false}
          >
            <View style={styles.reportIconFrame}>
              <View
                style={[
                  styles.reportIconBg,
                  { backgroundColor: crowdReportColor(r.flood_level) }
                ]}
              >
                <UserRoundCheckIcon size={16} color="#111111" strokeWidth={2.1} />
              </View>
            </View>
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>Báo cáo người dân</Text>
                {r.flood_level ? (
                  <Text style={styles.calloutMeta}>Mức ngập: {getFloodLevelLabel(r.flood_level)}</Text>
                ) : null}
                {r.reporter_name ? (
                  <Text style={styles.calloutMeta}>Người báo: {r.reporter_name}</Text>
                ) : null}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {!mapboxTileUrl ? (
        <View style={[styles.mapHint, { pointerEvents: 'none' }]}>
          <Text style={styles.mapHintText}>
            Thêm EXPO_PUBLIC_MAPBOX_TOKEN trong mobile/.env để dùng nền Mapbox
          </Text>
        </View>
      ) : null}

      {locError ? (
        <View style={styles.locBanner}>
          <Text style={styles.locBannerText}>{locError}</Text>
        </View>
      ) : null}
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
  wrap: { flex: 1 },
  map: { flex: 1 },
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
  reportIconFrame: {
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
  reportIconBg: {
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
  calloutMeta: { fontSize: 13, color: colors.textMuted },
  mapHint: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 8,
    borderRadius: 8
  },
  mapHintText: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  locBanner: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(254,243,199,0.95)',
    padding: 8,
    borderRadius: 8
  },
  locBannerText: { fontSize: 12, color: '#92400e' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(240,249,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: { color: colors.textMuted, fontSize: 14 }
});
