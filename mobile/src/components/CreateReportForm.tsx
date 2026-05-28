import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { getAccessToken } from '../lib/authStorage';
import { FLOOD_LEVELS, isValidFloodLevel } from '../lib/floodLevels';
import {
  submitFloodReport,
  uploadReportImage
} from '../lib/reportsApi';
import { useTabBarContentInset } from '../constants/tabBarLayout';
import GradientPressable from './GradientPressable';
import { colors } from '../theme';
import ReportLocationPickerModal from './ReportLocationPickerModal';

const MAX_PHOTOS = 5;
const MAX_CONTENT = 500;

type PhotoItem = {
  id: string;
  uri: string;
  mimeType?: string;
};

function pickDisplayName(user: Record<string, unknown> | null): string {
  const candidates = [
    user,
    user?.user as Record<string, unknown> | undefined,
    user?.data as Record<string, unknown> | undefined
  ];
  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue;
    const value =
      (item.full_name as string) ||
      (item.fullName as string) ||
      (item.name as string) ||
      (item.username as string);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'Người dùng';
}

type Props = {
  onSuccess?: () => void;
};

export default function CreateReportForm({ onSuccess }: Props) {
  const tabBarInset = useTabBarContentInset();
  const { user, isAuthenticated } = useAuth();
  const reporterName = useMemo(() => pickDisplayName(user), [user]);

  const [level, setLevel] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [addressText, setAddressText] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function appendPhotos(
    assets: ImagePicker.ImagePickerAsset[],
    maxCount: number
  ) {
    if (!assets.length) return;
    const next = assets.slice(0, maxCount).map((asset) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg'
    }));
    setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
  }

  async function pickPhotosFromLibrary() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Quyền truy cập', 'Cần quyền thư viện ảnh để đính kèm hình báo cáo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85
    });

    if (result.canceled || !result.assets?.length) return;
    appendPhotos(result.assets, remaining);
  }

  async function takePhotoWithCamera() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Quyền truy cập', 'Cần quyền camera để chụp ảnh hiện trường.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85
    });

    if (result.canceled || !result.assets?.length) return;
    appendPhotos(result.assets, remaining);
  }

  function onAddPhotoPress() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    Alert.alert('Thêm ảnh hiện trường', `Còn thêm tối đa ${remaining} ảnh`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Chụp ảnh', onPress: () => void takePhotoWithCamera() },
      { text: 'Chọn từ thư viện', onPress: () => void pickPhotosFromLibrary() }
    ]);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function onMapConfirm(nextLat: number, nextLng: number) {
    setLat(nextLat);
    setLng(nextLng);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setSuccessMsg(null);

    if (!isValidFloodLevel(level)) {
      setError('Vui lòng chọn mức độ ngập.');
      return;
    }
    if (lat == null || lng == null) {
      setError('Vui lòng chọn vị trí trên bản đồ.');
      return;
    }

    const token = await getAccessToken();
    if (isAuthenticated && !token) {
      setError('Phiên đăng nhập không hợp lệ. Vui lòng đăng xuất và đăng nhập lại.');
      return;
    }

    setSubmitting(true);
    try {
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const uploaded = await uploadReportImage(photo.uri, photo.mimeType);
        if (!uploaded.success) {
          setError(uploaded.error);
          return;
        }
        photoUrls.push(uploaded.photo_url);
      }

      const payload = {
        level,
        lat,
        lng,
        ...(content.trim() ? { content: content.trim() } : {}),
        ...(addressText.trim() ? { location_description: addressText.trim() } : {}),
        ...(photoUrls.length > 0
          ? { photo_url: photoUrls[0], photo_urls: photoUrls }
          : {}),
        ...(isAuthenticated && reporterName && reporterName !== 'Người dùng'
          ? { name: reporterName }
          : {})
      };

      const result = await submitFloodReport(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccessMsg(result.message || 'Báo cáo đã được gửi thành công.');
      setLevel('');
      setContent('');
      setPhotos([]);
      setAddressText('');
      setLat(null);
      setLng(null);
      onSuccess?.();
    } catch {
      setError('Không gửi được báo cáo. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarInset + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.reporterBanner}>
          <GradientPressable style={styles.reporterIcon} borderRadius={18} pointerEvents="none">
            <Ionicons name="person" size={18} color="#fff" />
          </GradientPressable>
          <Text style={styles.reporterText}>
            Báo cáo với tên: <Text style={styles.reporterName}>{reporterName}</Text>
          </Text>
        </View>

        <SectionLabel required>Mức độ ngập</SectionLabel>
        <View style={styles.levelCard}>
          {FLOOD_LEVELS.map((opt, index) => {
            const selected = level === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.levelRow,
                  index > 0 && styles.levelRowBorder,
                  selected && styles.levelRowSelected
                ]}
                onPress={() => setLevel(opt.value)}
              >
                <View style={[styles.levelDot, { backgroundColor: opt.color }]} />
                <Text
                  style={[styles.levelLabel, selected && styles.levelLabelSelected]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>Mô tả (tùy chọn)</SectionLabel>
        <View style={styles.card}>
          <TextInput
            style={styles.textareaDark}
            value={content}
            onChangeText={(t) => setContent(t.slice(0, MAX_CONTENT))}
            placeholder="VD: Nước ngập đến bánh xe, không di chuyển được..."
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {content.length}/{MAX_CONTENT} ký tự
          </Text>
        </View>

        <SectionLabel>{`Hình ảnh hiện trường (tối đa ${MAX_PHOTOS} ảnh)`}</SectionLabel>
        <View style={styles.photosBlock}>
          <View style={styles.photosRow}>
            {photos.length < MAX_PHOTOS ? (
              <Pressable style={styles.photoAddBtn} onPress={onAddPhotoPress}>
                <Ionicons name="camera-outline" size={24} color="#2563eb" />
                <Text style={styles.photoAddText}>Thêm ảnh</Text>
              </Pressable>
            ) : null}
            {photos.map((p) => (
              <View key={p.id} style={styles.photoThumb}>
                <Image source={{ uri: p.uri }} style={styles.photoImage} />
                <Pressable
                  style={styles.photoRemove}
                  onPress={() => removePhoto(p.id)}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={14} color="#334155" />
                </Pressable>
              </View>
            ))}
          </View>
          <Text style={styles.photosRemaining}>
            Còn lại {MAX_PHOTOS - photos.length} ảnh
          </Text>
        </View>

        <SectionLabel required>Vị trí</SectionLabel>
        <View style={styles.locationCard}>
          <Text style={styles.locationExample}>VD: Đường 3 tháng 2, Quận 10</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationInputWrap}>
              <Ionicons name="location-outline" size={20} color="#94a3b8" />
              <TextInput
                style={styles.locationInput}
                value={addressText}
                onChangeText={setAddressText}
                placeholder="Nhập địa chỉ hoặc chọn trên bản đồ"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <Pressable style={styles.mapBtn} onPress={() => setMapOpen(true)}>
              <Ionicons name="map-outline" size={18} color="#64748b" />
              <Text style={styles.mapBtnText}>Bản đồ</Text>
            </Pressable>
          </View>
          {lat != null && lng != null ? (
            <View style={styles.locationPicked}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={styles.locationPickedText}>
                {addressText.trim() ||
                  `Đã chọn tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
              </Text>
            </View>
          ) : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

        <GradientPressable
          style={styles.submitBtn}
          borderRadius={999}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Gửi báo cáo</Text>
          )}
        </GradientPressable>
      </ScrollView>

      <ReportLocationPickerModal
        visible={mapOpen}
        initialLat={lat}
        initialLng={lng}
        onClose={() => setMapOpen(false)}
        onConfirm={onMapConfirm}
      />
    </>
  );
}

function SectionLabel({
  children,
  required
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.sectionLabel}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
    backgroundColor: '#f2f2f7'
  },
  reporterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    marginBottom: 4
  },
  reporterIcon: {
    width: 36,
    height: 36
  },
  reporterText: { flex: 1, fontSize: 14, color: '#334155' },
  reporterName: { fontWeight: '700', color: '#0f172a' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 2
  },
  required: { color: '#ef4444' },
  levelCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  levelRowBorder: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  levelRowSelected: { backgroundColor: '#f1f5f9' },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  levelLabel: { flex: 1, fontSize: 15, color: '#64748b' },
  levelLabelSelected: { color: '#334155', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  textareaDark: {
    minHeight: 100,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4
  },
  photosBlock: { gap: 8 },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoAddBtn: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#60a5fa',
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  photoAddText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  photosRemaining: { fontSize: 12, color: '#94a3b8' },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border
  },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  locationExample: {
    backgroundColor: '#ffffff',
    color: '#94a3b8',
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    padding: 12
  },
  locationInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 44
  },
  locationInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 8
  },
  mapBtn: {
    minWidth: 64,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fff'
  },
  mapBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  locationPicked: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  locationPickedText: { flex: 1, fontSize: 13, color: '#166534', lineHeight: 18 },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 4
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    marginTop: 4
  },
  submitBtn: {
    marginTop: 12,
    paddingVertical: 15,
    width: '100%'
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
