import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type MapPressEvent } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HCM_MAP_CENTER } from '@hcm-flood/shared';
import GradientPressable from './GradientPressable';
import { colors } from '../theme';

type Props = {
  visible: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
};

export default function ReportLocationPickerModal({
  visible,
  initialLat,
  initialLng,
  onClose,
  onConfirm
}: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialLat != null && initialLng != null) {
      setPin({ lat: initialLat, lng: initialLng });
    } else {
      setPin(null);
    }
  }, [visible, initialLat, initialLng]);

  function onMapPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ lat: latitude, lng: longitude });
  }

  function handleConfirm() {
    if (!pin) return;
    onConfirm(pin.lat, pin.lng);
    onClose();
  }

  const region = {
    latitude: pin?.lat ?? initialLat ?? HCM_MAP_CENTER.lat,
    longitude: pin?.lng ?? initialLng ?? HCM_MAP_CENTER.lng,
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
              paddingBottom: 14
            }
          ]}
        >
          <Text style={styles.title} numberOfLines={2}>
            Chọn vị trí trên bản đồ
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
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={region}
            onPress={onMapPress}
          >
            {pin ? (
              <Marker
                coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                title="Vị trí báo cáo"
              />
            ) : null}
          </MapView>
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.hint}>
            {pin
              ? `Đã chọn: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
              : 'Chạm vào bản đồ để đánh dấu vị trí ngập'}
          </Text>
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
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.primaryDark
  },
  title: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 40,
    justifyContent: 'center'
  },
  close: { color: '#bae6fd', fontSize: 15, fontWeight: '600' },
  map: { flex: 1 },
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
  confirmBtn: {
    paddingVertical: 14,
    width: '100%'
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
