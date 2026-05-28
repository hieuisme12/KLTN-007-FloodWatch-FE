import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createEmergencySubscription,
  deleteEmergencySubscription,
  fetchMyEmergencySubscriptions,
  fetchTelegramLinkStatus,
  requestTelegramLink,
  type EmergencySubscription,
  unlinkTelegram,
  updateEmergencySubscription
} from '../lib/emergencyApi';
import GradientPressable from './GradientPressable';
import ReportLocationPickerModal from './ReportLocationPickerModal';
import { colors } from '../theme';

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

type SectionProps = {
  /** Đăng ký hàm reload cho pull-to-refresh ở màn Tài khoản */
  onRegisterReload?: (reload: () => Promise<void>) => void;
};

export default function EmergencySubscriptionsSection({ onRegisterReload }: SectionProps = {}) {
  const [linked, setLinked] = useState(false);
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [subs, setSubs] = useState<EmergencySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('500');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [telegramPolling, setTelegramPolling] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  const refreshTelegramStatus = useCallback(async () => {
    try {
      const status = await fetchTelegramLinkStatus();
      if (!status?.success) return false;
      const isLinked = Boolean(status?.data?.linked);
      setLinked(isLinked);
      setTelegramDeepLink((status?.data?.deep_link as string | undefined) ?? null);
      return isLinked;
    } catch {
      return false;
    }
  }, []);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [isLinked, mySubs] = await Promise.all([
        refreshTelegramStatus(),
        fetchMyEmergencySubscriptions()
      ]);
      if (isLinked) setTelegramPolling(false);
      setSubs(mySubs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu đăng ký');
    } finally {
      setLoading(false);
    }
  }, [refreshTelegramStatus]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    onRegisterReload?.(() => loadAll());
  }, [loadAll, onRegisterReload]);

  useFocusEffect(
    useCallback(() => {
      void refreshTelegramStatus();
    }, [refreshTelegramStatus])
  );

  useEffect(() => {
    if (!telegramPolling) return;
    const checkLinked = async () => {
      try {
        const isLinked = await refreshTelegramStatus();
        if (isLinked) {
          setTelegramPolling(false);
          setLinkMessage('Đã liên kết Telegram thành công.');
          await loadAll();
        }
      } catch {
        // tiếp tục poll
      }
    };
    void checkLinked();
    const intervalId = setInterval(() => void checkLinked(), 4000);
    const stopPoll = setTimeout(() => setTelegramPolling(false), 120000);
    return () => {
      clearInterval(intervalId);
      clearTimeout(stopPoll);
    };
  }, [telegramPolling, refreshTelegramStatus, loadAll]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      void (async () => {
        const isLinked = await refreshTelegramStatus();
        if (isLinked && telegramPolling) {
          setTelegramPolling(false);
          setLinkMessage('Đã liên kết Telegram thành công.');
          await loadAll();
        }
      })();
    });
    return () => sub.remove();
  }, [telegramPolling, refreshTelegramStatus, loadAll]);

  const canCreate = useMemo(() => linked && !busy, [linked, busy]);

  function onMapConfirm(nextLat: number, nextLng: number) {
    setLat(nextLat);
    setLng(nextLng);
  }

  async function onCreateSubscription() {
    if (!linked) {
      Alert.alert('Chưa liên kết Telegram', 'Vui lòng liên kết Telegram trước khi tạo đăng ký.');
      return;
    }
    if (lat == null || lng == null) {
      Alert.alert('Chưa chọn vị trí', 'Vui lòng chọn vị trí trên bản đồ hoặc dùng GPS trong bản đồ.');
      return;
    }
    const radiusNum = Number(radius);
    if (!Number.isFinite(radiusNum) || radiusNum <= 0) {
      Alert.alert('Dữ liệu chưa hợp lệ', 'Vui lòng nhập bán kính hợp lệ (mét).');
      return;
    }
    setBusy(true);
    try {
      const res = await createEmergencySubscription({
        lat,
        lng,
        radius: radiusNum,
        name: name.trim() || null
      });
      if (!res?.success) throw new Error(res?.error || 'Tạo đăng ký thất bại');
      setName('');
      setLat(null);
      setLng(null);
      await loadAll();
    } catch (e) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Tạo đăng ký thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function onToggleSub(item: EmergencySubscription, nextActive: boolean) {
    setBusy(true);
    try {
      const res = await updateEmergencySubscription(item.id, {
        is_active: nextActive,
        lat: item.lat,
        lng: item.lng,
        radius: item.radius,
        name: item.name ?? null
      });
      if (!res?.success) throw new Error(res?.error || 'Cập nhật thất bại');
      setSubs((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, is_active: nextActive } : s))
      );
    } catch (e) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Cập nhật thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteSub(item: EmergencySubscription) {
    Alert.alert('Xóa đăng ký', 'Bạn chắc chắn muốn xóa đăng ký này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const res = await deleteEmergencySubscription(item.id);
            if (!res?.success) throw new Error(res?.error || 'Xóa thất bại');
            setSubs((prev) => prev.filter((s) => s.id !== item.id));
          } catch (e) {
            Alert.alert('Lỗi', e instanceof Error ? e.message : 'Xóa thất bại');
          } finally {
            setBusy(false);
          }
        }
      }
    ]);
  }

  async function onTelegramLink() {
    setBusy(true);
    setError(null);
    setLinkMessage(null);
    try {
      const res = await requestTelegramLink();
      if (!res?.success) {
        throw new Error(
          (res?.error as string | undefined) || 'Không tạo được liên kết Telegram'
        );
      }
      const deepLink =
        (res?.data?.deep_link as string | undefined) ||
        (res?.data?.deepLink as string | undefined) ||
        telegramDeepLink;
      if (!deepLink) {
        Alert.alert('Lỗi', 'Phản hồi từ server không có liên kết Telegram.');
        return;
      }
      const canOpen = await Linking.canOpenURL(deepLink);
      if (!canOpen) {
        Alert.alert('Lỗi', 'Thiết bị không mở được liên kết Telegram.');
        return;
      }
      await Linking.openURL(deepLink);
      setTelegramPolling(true);
      setLinkMessage(
        'Đã mở Telegram. Nhấn Start trên bot, sau đó quay lại app — trạng thái sẽ tự cập nhật.'
      );
    } catch (e) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể liên kết Telegram');
    } finally {
      setBusy(false);
    }
  }

  async function onTelegramUnlink() {
    setBusy(true);
    try {
      const res = await unlinkTelegram();
      if (!res?.success) throw new Error(res?.error || 'Hủy liên kết thất bại');
      await loadAll();
    } catch (e) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Hủy liên kết thất bại');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.sectionTitle}>Đăng ký nhận tin khẩn cấp</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Liên kết Telegram</Text>
        <Text style={styles.statusText}>
          Trạng thái: {linked ? 'Đã liên kết' : 'Chưa liên kết'}
        </Text>
        {telegramPolling ? (
          <View style={styles.pollingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.pollingText}>Đang chờ xác nhận từ Telegram…</Text>
          </View>
        ) : null}
        {linkMessage ? <Text style={styles.linkMessage}>{linkMessage}</Text> : null}
        {!linked ? (
          <GradientPressable style={styles.primaryBtn} onPress={onTelegramLink} disabled={busy}>
            <Text style={styles.primaryBtnText}>Liên kết Telegram</Text>
          </GradientPressable>
        ) : (
          <GradientPressable variant="red" style={styles.dangerBtn} onPress={onTelegramUnlink} disabled={busy}>
            <Text style={styles.primaryBtnText}>Hủy liên kết</Text>
          </GradientPressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tạo đăng ký vùng mới</Text>

        <FieldLabel>Tên hiển thị (tùy chọn)</FieldLabel>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="VD: Nhà, Công ty, Khu phố..."
          placeholderTextColor="#94a3b8"
        />

        <FieldLabel required>Bán kính (m)</FieldLabel>
        <TextInput
          style={styles.input}
          value={radius}
          onChangeText={setRadius}
          keyboardType="numeric"
          placeholder="VD: 500"
          placeholderTextColor="#94a3b8"
        />

        <FieldLabel required>Vị trí tâm vùng</FieldLabel>
        {lat != null && lng != null ? (
          <View style={styles.coordPicked}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={styles.coordPickedText}>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </Text>
          </View>
        ) : (
          <Text style={styles.coordEmpty}>Chưa chọn vị trí — mở bản đồ để chọn hoặc lấy GPS</Text>
        )}
        <Pressable style={styles.mapBtn} onPress={() => setMapOpen(true)} disabled={busy}>
          <Ionicons name="map-outline" size={18} color="#0369a1" />
          <Text style={styles.mapBtnText}>Chọn trên bản đồ</Text>
        </Pressable>

        <GradientPressable
          style={styles.createBtn}
          borderRadius={999}
          onPress={onCreateSubscription}
          disabled={!canCreate || busy}
        >
          <Text style={styles.primaryBtnText}>Tạo đăng ký</Text>
        </GradientPressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Đăng ký của tôi ({subs.length})</Text>
        {subs.length === 0 ? (
          <Text style={styles.empty}>Chưa có đăng ký nào.</Text>
        ) : (
          subs.map((item) => (
            <View key={String(item.id)} style={styles.subRow}>
              <View style={styles.subMain}>
                <Text style={styles.subTitle}>{item.name?.trim() || `Đăng ký #${item.id}`}</Text>
                <Text style={styles.subMeta}>
                  {item.lat.toFixed(5)}, {item.lng.toFixed(5)} · {Math.round(item.radius)}m
                </Text>
              </View>
              <Switch
                value={item.is_active !== false}
                onValueChange={(v) => void onToggleSub(item, v)}
                disabled={busy}
              />
              <Pressable onPress={() => void onDeleteSub(item)} hitSlop={8} disabled={busy}>
                <Text style={styles.deleteTxt}>Xóa</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ReportLocationPickerModal
        visible={mapOpen}
        initialLat={lat}
        initialLng={lng}
        title="Chọn vị trí đăng ký"
        emptyHint="Chạm vào bản đồ để chọn tâm vùng nhận cảnh báo"
        pinTitle="Tâm vùng đăng ký"
        showGpsInFooter
        onClose={() => setMapOpen(false)}
        onConfirm={onMapConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  root: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 8
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  statusText: { fontSize: 14, color: '#334155' },
  pollingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollingText: { fontSize: 13, color: colors.primary, flex: 1 },
  linkMessage: { fontSize: 13, color: '#0369a1', lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 4 },
  required: { color: colors.danger },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff'
  },
  coordPicked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4
  },
  coordPickedText: { fontSize: 13, color: '#0f172a', flex: 1 },
  coordEmpty: { fontSize: 13, color: '#64748b' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#f0f9ff'
  },
  mapBtnText: { fontSize: 14, fontWeight: '700', color: '#0369a1' },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  createBtn: {
    marginTop: 4,
    paddingVertical: 12,
    width: '100%'
  },
  dangerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  subRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  subMain: { flex: 1 },
  subTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  subMeta: { marginTop: 2, fontSize: 12, color: '#64748b' },
  deleteTxt: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
  empty: { color: '#64748b', fontSize: 13 },
  errorText: { color: colors.danger, fontSize: 13, marginTop: 2 }
});
