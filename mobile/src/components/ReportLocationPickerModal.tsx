import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile, type MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HCM_MAP_CENTER } from '@hcm-flood/shared';
import { fetchMapSensors, type MapSensor } from '../lib/mapApi';
import { getMapboxTileUrl } from '../lib/mapboxTiles';
import { curvedHeaderText } from './curvedTabScreen';
import GradientPressable from './GradientPressable';
import { MapSensorMarkers, MapUserGpsMarker } from './FloodMapMarkers';
import TabHeaderGradient from './TabHeaderGradient';
import { colors } from '../theme';

type Props = {
  visible: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  title?: string;
  emptyHint?: string;
  pinTitle?: string;
  showGpsInFooter?: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
};

export default function ReportLocationPickerModal({
  visible,
  initialLat,
  initialLng,
  title = 'Chọn vị trí trên bản đồ',
  emptyHint = 'Chạm vào bản đồ để đánh dấu vị trí',
  pinTitle = 'Vị trí đã chọn',
  showGpsInFooter = false,
  onClose,
  onConfirm
}: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [sensors, setSensors] = useState<MapSensor[]>([]);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapboxTileUrl = getMapboxTileUrl();

  useEffect(() => {
    if (!visible) return;
    if (initialLat != null && initialLng != null) {
      setPin({ lat: initialLat, lng: initialLng });
    } else {
      setPin(null);
    }
  }, [visible, initialLat, initialLng]);

  useEffect(() => {
    if (!visible) return;
    fetchMapSensors().then(setSensors).catch(() => {});
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
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
        // GPS unavailable
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  function onMapPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ lat: latitude, lng: longitude });
  }

  function handleConfirm() {
    if (!pin) return;
    onConfirm(pin.lat, pin.lng);
    onClose();
  }

  function handleUseGps() {
    if (!userCoords) {
      Alert.alert('Chưa có GPS', 'Không lấy được vị trí hiện tại. Hãy cấp quyền vị trí hoặc chọn trên bản đồ.');
      return;
    }
    setPin({ lat: userCoords.latitude, lng: userCoords.longitude });
    mapRef.current?.animateToRegion(
      {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      },
      400
    );
  }

  const region = {
    latitude: pin?.lat ?? initialLat ?? userCoords?.latitude ?? HCM_MAP_CENTER.lat,
    longitude: pin?.lng ?? initialLng ?? userCoords?.longitude ?? HCM_MAP_CENTER.lng,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06
  };

  const modalAnimation = Platform.OS === 'web' ? 'fade' : 'slide';

  return (
    <Modal visible={visible} animationType={modalAnimation} onRequestClose={onClose}>
      <View style={styles.root}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 12,
              paddingBottom: 16
            }
          ]}
        >
          <TabHeaderGradient />
          <Text style={[curvedHeaderText.topTitle, styles.title]} numberOfLines={2}>
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.closeBtn}
          >
            <Text style={styles.close}>Đóng</Text>
          </Pressable>
        </View>

        {Platform.OS === 'web' ? (
          <View style={styles.webStub}>
            <Text style={styles.webStubText}>
              Chọn vị trí trên bản đồ chỉ hỗ trợ trên điện thoại. Mở bằng Expo Go (Android/iOS).
            </Text>
          </View>
        ) : (
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={region}
              showsUserLocation={false}
              showsMyLocationButton={Platform.OS === 'android'}
              toolbarEnabled={false}
              onPress={onMapPress}
            >
              {mapboxTileUrl ? (
                <UrlTile urlTemplate={mapboxTileUrl} maximumZ={20} flipY={false} />
              ) : null}

              <MapSensorMarkers sensors={sensors} keyPrefix="report-picker-sensor" />
              <MapUserGpsMarker coords={userCoords} />

              {pin ? (
                <Marker
                  coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                  pinColor="#dc2626"
                  title={pinTitle}
                  zIndex={10}
                />
              ) : null}
            </MapView>

            {!mapboxTileUrl ? (
              <View style={styles.mapHint} pointerEvents="none">
                <Text style={styles.mapHintText}>
                  Thêm EXPO_PUBLIC_MAPBOX_TOKEN trong mobile/.env để dùng nền Mapbox
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.hint}>
            {pin
              ? `Đã chọn: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
              : emptyHint}
          </Text>
          {showGpsInFooter ? (
            <Pressable style={styles.gpsBtn} onPress={handleUseGps}>
              <Text style={styles.gpsBtnText}>Lấy GPS hiện tại</Text>
            </Pressable>
          ) : null}
          <GradientPressable
            style={styles.confirmBtn}
            borderRadius={999}
            onPress={handleConfirm}
            disabled={!pin}
          >
            <Text style={styles.confirmText}>Xác nhận</Text>
          </GradientPressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
    overflow: 'hidden'
  },
  title: { flex: 1, fontSize: 20, zIndex: 1 },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 40,
    justifyContent: 'center',
    zIndex: 1
  },
  close: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: '600'
  },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  mapHint: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 8,
    borderRadius: 8
  },
  mapHintText: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  webStub: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc'
  },
  webStubText: { textAlign: 'center', color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  footer: {
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#fff'
  },
  hint: { fontSize: 13, color: colors.textMuted },
  gpsBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  gpsBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  confirmBtn: {
    paddingVertical: 14,
    width: '100%'
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
