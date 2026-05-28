import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { fetchAuthProfile, getAccessToken, updateAuthProfile } from '../../src/lib/api';
import EmergencySubscriptionsSection from '../../src/components/EmergencySubscriptionsSection';
import UserRoundCogIcon from '../../src/components/UserRoundCogIcon';
import { colors } from '../../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, refreshUser, isAuthenticated, isLoading } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        if (!token) return;
        const data = await fetchAuthProfile();
        if (!cancelled) setProfile(data as Record<string, unknown>);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Không tải được hồ sơ');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  async function handleLogout() {
    await signOut();
    await refreshUser();
    setProfile(null);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.guest}>
        <Text style={styles.guestTitle}>Chưa đăng nhập</Text>
        <Text style={styles.guestHint}>
          Đăng nhập để xem hồ sơ và báo cáo đầy đủ trên FloodSight.
        </Text>
        <Pressable style={styles.loginBtn} onPress={() => router.push('/login')}>
          <Text style={styles.loginBtnText}>Đăng nhập</Text>
        </Pressable>
      </View>
    );
  }

  const merged = { ...user, ...profile };
  const name =
    (merged.full_name as string) ||
    (merged.username as string) ||
    'Người dùng';
  const email = (merged.email as string) || '—';
  const phone = (merged.phone as string) || '—';

  function openEdit() {
    setEditFullName((merged.full_name as string) || '');
    setEditEmail((merged.email as string) || '');
    setEditPhone((merged.phone as string) || '');
    setEditOpen(true);
  }

  async function onSaveProfile() {
    setSaving(true);
    try {
      const payload = {
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim()
      };
      const res = await updateAuthProfile(payload);
      if (!res?.success) throw new Error(res?.error || 'Cập nhật hồ sơ thất bại');
      const refreshed = await fetchAuthProfile();
      setProfile(refreshed as Record<string, unknown>);
      await refreshUser();
      setEditOpen(false);
    } catch (e) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Cập nhật hồ sơ thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.card}>
          <Pressable style={styles.editBtn} onPress={openEdit} hitSlop={8}>
            <UserRoundCogIcon size={20} color="#0f172a" strokeWidth={2} />
          </Pressable>
          <Text style={styles.name}>{name}</Text>
          <Row label="Email" value={email} />
          <Row label="SĐT" value={phone} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}

      <EmergencySubscriptionsSection />

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>

      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
            <TextInput
              style={styles.input}
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="Họ và tên"
            />
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Email"
            />
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholder="Số điện thoại"
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setEditOpen(false)} disabled={saving}>
                <Text style={styles.cancelText}>Hủy</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={onSaveProfile} disabled={saving}>
                <Text style={styles.saveText}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guest: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background
  },
  guestTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  guestHint: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  loginBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  loginBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 30 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12
  },
  editBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.15)'
  },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  row: { gap: 2 },
  rowLabel: { fontSize: 13, color: colors.textMuted },
  rowValue: { fontSize: 16, color: colors.text },
  error: { color: colors.danger, fontSize: 14 },
  logoutButton: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    padding: 20,
    justifyContent: 'center'
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 10
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  cancelText: {
    color: '#334155',
    fontWeight: '600'
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveText: {
    color: '#fff',
    fontWeight: '700'
  }
});
