import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import * as Location from 'expo-location';
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
import { colors } from '../theme';

export default function EmergencySubscriptionsSection() {
  const [linked, setLinked] = useState(false);
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [subs, setSubs] = useState<EmergencySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('500');
  const [lat, setLat] = useState('10.8231');
  const [lng, setLng] = useState('106.6297');

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [status, mySubs] = await Promise.all([
        fetchTelegramLinkStatus(),
        fetchMyEmergencySubscriptions()
      ]);
      setLinked(Boolean(status?.data?.linked));
      setTelegramDeepLink((status?.data?.deep_link as string | undefined) ?? null);
      setSubs(mySubs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu đăng ký');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const canCreate = useMemo(() => linked && !busy, [linked, busy]);

  async function onUseGps() {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Chưa cấp quyền', 'Vui lòng cấp quyền vị trí để lấy tọa độ GPS.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(String(pos.coords.latitude.toFixed(6)));
      setLng(String(pos.coords.longitude.toFixed(6)));
    } catch {
      Alert.alert('Lỗi GPS', 'Không thể lấy vị trí hiện tại.');
    }
  }

  async function onCreateSubscription() {
    if (!linked) {
      Alert.alert('Chưa liên kết Telegram', 'Vui lòng liên kết Telegram trước khi tạo đăng ký.');
      return;
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radiusNum = Number(radius);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) || !Number.isFinite(radiusNum)) {
      Alert.alert('Dữ liệu chưa hợp lệ', 'Vui lòng kiểm tra lại tọa độ và bán kính.');
      return;
    }
    setBusy(true);
    try {
      const res = await createEmergencySubscription({
        lat: latNum,
        lng: lngNum,
        radius: radiusNum,
        name: name.trim() || null
      });
      if (!res?.success) throw new Error(res?.error || 'Tạo đăng ký thất bại');
      setName('');
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
    try {
      const res = await requestTelegramLink();
      const deepLink = (res?.data?.deep_link as string | undefined) || telegramDeepLink;
      if (deepLink) await Linking.openURL(deepLink);
      await loadAll();
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
        {!linked ? (
          <Pressable style={styles.primaryBtn} onPress={onTelegramLink} disabled={busy}>
            <Text style={styles.primaryBtnText}>Liên kết Telegram</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.dangerBtn} onPress={onTelegramUnlink} disabled={busy}>
            <Text style={styles.primaryBtnText}>Hủy liên kết</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tạo đăng ký vùng mới</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Tên hiển thị (tùy chọn)"
        />
        <View style={styles.inline}>
          <TextInput
            style={[styles.input, styles.half]}
            value={lat}
            onChangeText={setLat}
            keyboardType="decimal-pad"
            placeholder="Vĩ độ"
          />
          <TextInput
            style={[styles.input, styles.half]}
            value={lng}
            onChangeText={setLng}
            keyboardType="decimal-pad"
            placeholder="Kinh độ"
          />
        </View>
        <TextInput
          style={styles.input}
          value={radius}
          onChangeText={setRadius}
          keyboardType="numeric"
          placeholder="Bán kính (m)"
        />
        <View style={styles.inline}>
          <Pressable style={[styles.ghostBtn, styles.flex]} onPress={onUseGps} disabled={busy}>
            <Text style={styles.ghostBtnText}>Lấy GPS hiện tại</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, styles.flex, !canCreate && styles.disabledBtn]}
            onPress={onCreateSubscription}
            disabled={!canCreate}
          >
            <Text style={styles.primaryBtnText}>Tạo đăng ký</Text>
          </Pressable>
        </View>
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
    gap: 10
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  statusText: { fontSize: 14, color: '#334155' },
  inline: { flexDirection: 'row', gap: 8 },
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
  half: { flex: 1 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center'
  },
  dangerBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center'
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  ghostBtnText: { color: '#334155', fontWeight: '600' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  flex: { flex: 1 },
  disabledBtn: { opacity: 0.55 },
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
