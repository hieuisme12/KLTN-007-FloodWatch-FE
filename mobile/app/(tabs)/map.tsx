import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Callout, Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarInset } from '../../src/constants/tabBarLayout';
import GradientPressable from '../../src/components/GradientPressable';
import MapSheetNavBridge, { MAP_SHEET_BG } from '../../src/components/MapSheetNavBridge';
import { HCM_MAP_CENTER, MAP_POLL_MS } from '@hcm-flood/shared';
import {
  fetchSafePath,
  type RoutingVehicle,
  type SafePathResponse
} from '../../src/lib/routingApi';
import { fetchMapCrowdReports, fetchMapSensors, type MapCrowdReport, type MapSensor } from '../../src/lib/mapApi';
import { crowdReportColor, SENSOR_MARKER_COLORS } from '../../src/lib/mapColors';
import { getFloodLevelLabel } from '../../src/lib/floodLevels';
import RadarIcon from '../../src/components/RadarIcon';
import PinIcon from '../../src/components/PinIcon';
import MapPinnedIcon from '../../src/components/MapPinnedIcon';
import CircleXIcon from '../../src/components/CircleXIcon';
import BikeIcon from '../../src/components/BikeIcon';
import CarIcon from '../../src/components/CarIcon';
import TruckIcon from '../../src/components/TruckIcon';
import MapPinIcon from '../../src/components/MapPinIcon';
import UserRoundCheckIcon from '../../src/components/UserRoundCheckIcon';

type Segment = {
  from?: { lat?: number; lng?: number };
  to?: { lat?: number; lng?: number };
  flood_depth_cm?: number;
};

const VEHICLE_DEPTH: Record<RoutingVehicle, number> = {
  motorbike: 10,
  car: 20,
  suv: 40
};

const VEHICLE_LABEL: Record<RoutingVehicle, string> = {
  motorbike: 'Xe máy',
  car: 'Ô tô',
  suv: 'SUV'
};

function VehicleTypeIcon({ type, color }: { type: RoutingVehicle; color: string }) {
  if (type === 'motorbike') return <BikeIcon size={18} color={color} strokeWidth={2} />;
  if (type === 'car') return <CarIcon size={18} color={color} strokeWidth={2} />;
  return <TruckIcon size={18} color={color} strokeWidth={2} />;
}

function parseLatLngFromText(text: string) {
  const parts = text.split(',').map((p) => Number(p.trim()));
  if (parts.length !== 2) return null;
  const [lat, lng] = parts;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function parseCoordPair(lat: string, lng: string) {
  if (!lat.trim() || !lng.trim()) return null;
  const latN = Number(lat);
  const lngN = Number(lng);
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;
  return { lat: latN, lng: lngN };
}

function segmentColor(depth = 0, maxDepth = 10) {
  if (depth <= 0) return '#4CAF50';
  const ratio = depth / Math.max(1, maxDepth);
  if (ratio <= 0.5) return '#FFEB3B';
  if (ratio <= 1) return '#FF9800';
  return '#F44336';
}

export default function RoutingScreen() {
  const tabBarInset = useTabBarInset();
  const mapRef = useRef<MapView | null>(null);
  const sheetDragY = useRef(new Animated.Value(0)).current;
  const [pinTarget, setPinTarget] = useState<'start' | 'end'>('start');
  const [startLabel, setStartLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');
  const [startLat, setStartLat] = useState('');
  const [startLng, setStartLng] = useState('');
  const [endLat, setEndLat] = useState('');
  const [endLng, setEndLng] = useState('');
  const [vehicle, setVehicle] = useState<RoutingVehicle>('motorbike');
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SafePathResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sensors, setSensors] = useState<MapSensor[]>([]);
  const [reports, setReports] = useState<MapCrowdReport[]>([]);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const parsedStart = useMemo(() => parseCoordPair(startLat, startLng), [startLat, startLng]);
  const parsedEnd = useMemo(() => parseCoordPair(endLat, endLng), [endLat, endLng]);

  const routeSegments = useMemo(() => {
    const segments = ((result?.route?.segments as Segment[] | undefined) || []).filter(Boolean);
    return segments
      .map((s) => {
        const fromLat = Number(s.from?.lat);
        const fromLng = Number(s.from?.lng);
        const toLat = Number(s.to?.lat);
        const toLng = Number(s.to?.lng);
        if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return null;
        return {
          coords: [
            { latitude: fromLat, longitude: fromLng },
            { latitude: toLat, longitude: toLng }
          ],
          depth: Number(s.flood_depth_cm) || 0
        };
      })
      .filter(Boolean) as Array<{ coords: Array<{ latitude: number; longitude: number }>; depth: number }>;
  }, [result]);

  const grabberPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 2,
        onPanResponderMove: (_, gestureState) => {
          if (sheetCollapsed) {
            const next = Math.max(-70, Math.min(20, gestureState.dy));
            sheetDragY.setValue(next);
            return;
          }
          const next = Math.max(-20, Math.min(90, gestureState.dy));
          sheetDragY.setValue(next);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!sheetCollapsed && gestureState.dy > 28) {
            setSheetCollapsed(true);
          } else if (sheetCollapsed && gestureState.dy < -28) {
            setSheetCollapsed(false);
          }
          Animated.spring(sheetDragY, {
            toValue: 0,
            stiffness: 260,
            damping: 22,
            mass: 0.8,
            useNativeDriver: true
          }).start();
        }
      }),
    [sheetCollapsed, sheetDragY]
  );

  useEffect(() => {
    fetchMapSensors().then(setSensors).catch(() => {});
    fetchMapCrowdReports().then(setReports).catch(() => {});
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
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
        // GPS unavailable — marker hidden
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const initialRegion = useMemo(
    () => ({
      latitude: parsedStart?.lat ?? userCoords?.latitude ?? HCM_MAP_CENTER.lat,
      longitude: parsedStart?.lng ?? userCoords?.longitude ?? HCM_MAP_CENTER.lng,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06
    }),
    [parsedStart, userCoords]
  );

  useEffect(() => {
    if (!mapRef.current) return;
    if (routeSegments.length > 0) {
      const points = routeSegments.flatMap((s) => s.coords);
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 220, right: 40, bottom: 260, left: 40 },
        animated: true
      });
      return;
    }
    if (parsedStart) {
      mapRef.current.animateToRegion(
        {
          latitude: parsedStart.lat,
          longitude: parsedStart.lng,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06
        },
        450
      );
    }
  }, [routeSegments, parsedStart]);

  async function onFindPath() {
    const startFromText = parseLatLngFromText(startLabel);
    const endFromText = parseLatLngFromText(endLabel);
    const start_lat = startFromText?.lat ?? parsedStart?.lat;
    const start_lng = startFromText?.lng ?? parsedStart?.lng;
    const end_lat = endFromText?.lat ?? parsedEnd?.lat;
    const end_lng = endFromText?.lng ?? parsedEnd?.lng;

    const params = {
      start_lng,
      start_lat,
      end_lng,
      end_lat,
      vehicle_type: vehicle
    };
    if (Object.values(params).some((v) => typeof v === 'number' && !Number.isFinite(v))) {
      Alert.alert('Dữ liệu chưa hợp lệ', 'Vui lòng nhập đầy đủ tọa độ điểm đi/đến.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await fetchSafePath(params);
      if (!data?.success) throw new Error(data?.error || 'Không tìm được tuyến đường');
      setResult((data.data || {}) as SafePathResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tìm được tuyến đường');
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  function onMapPick(lat: number, lng: number) {
    const value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    if (pinTarget === 'start') {
      setStartLat(String(lat));
      setStartLng(String(lng));
      setStartLabel(value);
      return;
    }
    setEndLat(String(lat));
    setEndLng(String(lng));
    setEndLabel(value);
  }

  function onResetRoute() {
    setStartLabel('');
    setEndLabel('');
    setStartLat('');
    setStartLng('');
    setEndLat('');
    setEndLng('');
    setResult(null);
    setError(null);
    setPinTarget('start');
    setSheetCollapsed(true);
    sheetDragY.setValue(0);
    mapRef.current?.animateToRegion(
      {
        latitude: HCM_MAP_CENTER.lat,
        longitude: HCM_MAP_CENTER.lng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06
      },
      450
    );
  }

  const etaMinutes = Math.max(1, Math.round((result?.route?.total_cost_sec || 0) / 60));
  const distanceKm = ((result?.route?.total_distance_m || 0) / 1000).toFixed(1);
  const avoidedCount = result?.route?.avoided?.blocked_edge_ids?.length || 0;

  return (
    <View style={styles.container}>
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
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          onMapPick(latitude, longitude);
        }}
      >
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

        {parsedStart ? (
          <Marker
            coordinate={{ latitude: parsedStart.lat, longitude: parsedStart.lng }}
            pinColor="#3b82f6"
            title="Điểm đi"
          />
        ) : null}
        {parsedEnd ? (
          <Marker
            coordinate={{ latitude: parsedEnd.lat, longitude: parsedEnd.lng }}
            pinColor="#ef4444"
            title="Điểm đến"
          />
        ) : null}

        {sensors.map((s) => (
          <Marker
            key={`routing-sensor-${s.sensor_id}`}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            anchor={{ x: 0.5, y: 0.95 }}
            tracksViewChanges={false}
            title={s.location_name}
            description={`${s.water_level.toFixed(1)} cm`}
          >
            <View style={styles.sensorIconFrame}>
              <View
                style={[
                  styles.sensorIconBg,
                  { backgroundColor: SENSOR_MARKER_COLORS[s.status] }
                ]}
              >
                <RadarIcon size={16} color="#111111" strokeWidth={2.1} />
              </View>
            </View>
            <Callout>
              <View style={styles.sensorCallout}>
                <Text style={styles.sensorTitle}>{s.location_name}</Text>
                <Text style={styles.sensorMeta}>Mực nước: {s.water_level.toFixed(1)} cm</Text>
                <Text style={styles.sensorMeta}>
                  Trạng thái:{' '}
                  {s.status === 'normal'
                    ? 'Bình thường'
                    : s.status === 'warning'
                      ? 'Cảnh báo'
                      : s.status === 'elevated'
                        ? 'Nâng cao'
                        : s.status === 'danger'
                          ? 'Nguy hiểm'
                          : s.status === 'critical'
                            ? 'Nghiêm trọng'
                            : 'Mất kết nối'}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {reports.map((r) => (
          <Marker
            key={`routing-report-${r.id}`}
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
              <View style={styles.reportCallout}>
                <Text style={styles.reportTitle}>Báo cáo người dân</Text>
                {r.flood_level ? (
                  <Text style={styles.reportMeta}>
                    Mức ngập: {getFloodLevelLabel(r.flood_level)}
                  </Text>
                ) : null}
                {r.reporter_name ? (
                  <Text style={styles.reportMeta}>Người báo: {r.reporter_name}</Text>
                ) : null}
              </View>
            </Callout>
          </Marker>
        ))}

        {result?.found
          ? routeSegments.map((seg, idx) => (
              <Polyline
                key={`seg-${idx}`}
                coordinates={seg.coords}
                strokeColor={segmentColor(seg.depth, VEHICLE_DEPTH[vehicle])}
                strokeWidth={5}
              />
            ))
          : null}
      </MapView>

      <MapSheetNavBridge />

      <SafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        style={[styles.overlay, { paddingBottom: tabBarInset }]}
      >
        <View style={styles.topCard}>
          <View style={styles.routeRow}>
            <Pressable
              style={[styles.pinModeBtn, pinTarget === 'start' && styles.pinModeBtnActive]}
              onPress={() => setPinTarget('start')}
            >
              <PinIcon size={18} color={pinTarget === 'start' ? '#2563eb' : '#60a5fa'} strokeWidth={2} />
            </Pressable>
            <TextInput
              style={styles.routeInput}
              value={startLabel}
              onChangeText={setStartLabel}
              onFocus={() => setPinTarget('start')}
              placeholder="Điểm đi"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.routeRow}>
            <Pressable
              style={[styles.pinModeBtn, pinTarget === 'end' && styles.pinModeBtnActive]}
              onPress={() => setPinTarget('end')}
            >
              <MapPinnedIcon size={18} color={pinTarget === 'end' ? '#2563eb' : '#f87171'} strokeWidth={2} />
            </Pressable>
            <TextInput
              style={styles.routeInput}
              value={endLabel}
              onChangeText={setEndLabel}
              onFocus={() => setPinTarget('end')}
              placeholder="Điểm đến"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <Text style={styles.pinHint}>
            Đang ghim: {pinTarget === 'start' ? 'Điểm đi' : 'Điểm đến'} · Chạm lên bản đồ để lấy tọa độ
          </Text>
        </View>

        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetDragY }] }]}>
          <View style={styles.sheetTopRow}>
            <View style={styles.grabberWrap} {...grabberPanResponder.panHandlers}>
              <View style={styles.grabberBar} />
            </View>
            {!sheetCollapsed ? (
              <Pressable style={styles.sheetCloseBtn} onPress={onResetRoute} hitSlop={8}>
                <CircleXIcon size={24} color="#64748b" strokeWidth={2.2} />
              </Pressable>
            ) : (
              <View style={styles.sheetCloseBtn} />
            )}
          </View>
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Loại phương tiện</Text>
          </View>
          {!sheetCollapsed ? (
            <>
            <View style={styles.vehicleRow}>
              {(['motorbike', 'car', 'suv'] as RoutingVehicle[]).map((v) => {
                const selected = vehicle === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setVehicle(v)}
                    style={styles.vehicleItem}
                  >
                    <View style={styles.vehicleItemMain}>
                      <View style={styles.vehicleIconWrap}>
                        <VehicleTypeIcon type={v} color={selected ? '#1d4ed8' : '#334155'} />
                      </View>
                      <Text
                        style={[styles.vehicleItemText, selected && styles.vehicleItemTextActive]}
                        numberOfLines={1}
                      >
                        {VEHICLE_LABEL[v]}
                      </Text>
                    </View>
                    <Text style={[styles.vehicleDepth, selected && styles.vehicleItemTextActive]}>
                      {VEHICLE_DEPTH[v]} cm
                    </Text>
                    {selected ? <View style={styles.vehicleActiveBar} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.resultBox}>
              {result?.found ? (
                <>
                  <Text style={styles.etaText}>{etaMinutes} phút</Text>
                  <Text style={styles.metaText}>
                    {distanceKm} km · Tránh {avoidedCount} đoạn ngập
                  </Text>
                </>
              ) : (
                <Text style={styles.metaText}>
                  {result?.reason || 'Chọn loại xe và nhấn "Tìm đường an toàn" để bắt đầu.'}
                </Text>
              )}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <GradientPressable
              style={styles.findBtn}
              borderRadius={999}
              onPress={onFindPath}
              disabled={busy}
            >
              <Text style={styles.findBtnText}>{busy ? 'Đang tìm...' : 'Tìm đường an toàn'}</Text>
            </GradientPressable>
            </>
          ) : null}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e9f2fb' },
  map: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    zIndex: 2
  },
  topCard: {
    marginTop: 6,
    marginHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#dbe4ef'
  },
  routeInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: 6
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  pinModeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pinModeBtnActive: {
    backgroundColor: 'rgba(37,99,235,0.14)'
  },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  pinHint: {
    marginTop: 8,
    color: '#2563eb',
    fontSize: 12
  },
  bottomSheet: {
    backgroundColor: MAP_SHEET_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#dbe4ef',
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 0
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34
  },
  grabberWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    paddingBottom: 8,
    flex: 1
  },
  grabberBar: {
    width: 42,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#cbd5e1'
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  sheetTitle: { color: '#0f172a', fontSize: 30, fontWeight: '700' },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: -2
  },
  vehicleRow: { flexDirection: 'row', gap: 6, marginBottom: 10, width: '100%' },
  vehicleItem: {
    flex: 1,
    position: 'relative',
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
    overflow: 'hidden'
  },
  vehicleItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    flexWrap: 'nowrap'
  },
  vehicleIconWrap: { flexShrink: 0 },
  vehicleItemText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1
  },
  vehicleItemTextActive: { color: '#1d4ed8' },
  vehicleDepth: { color: '#64748b', fontSize: 11, marginTop: 4, textAlign: 'center' },
  vehicleActiveBar: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    height: 3,
    borderRadius: 99,
    backgroundColor: '#2563eb'
  },
  resultBox: {
    minHeight: 56,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderWidth: 1,
    borderColor: '#dbe4ef'
  },
  etaText: { color: '#1d4ed8', fontSize: 30, fontWeight: '800' },
  metaText: { color: '#334155', fontSize: 14, marginTop: 3 },
  errorText: { color: '#dc2626', fontSize: 13, marginTop: 6 },
  findBtn: {
    marginTop: 12,
    paddingVertical: 12,
    width: '100%'
  },
  findBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  gpsIconWrap: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2.5 },
    elevation: 5
  },
  sensorIconFrame: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4
  },
  sensorIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)'
  },
  sensorCallout: { minWidth: 170, maxWidth: 250 },
  sensorTitle: { fontWeight: '700', fontSize: 14, marginBottom: 4, color: '#0f172a' },
  sensorMeta: { fontSize: 13, color: '#475569' },
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
  reportCallout: { minWidth: 160, maxWidth: 240 },
  reportTitle: { fontWeight: '700', fontSize: 14, marginBottom: 4, color: '#0f172a' },
  reportMeta: { fontSize: 13, color: '#475569' }
});
