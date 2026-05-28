import { useCallback, useEffect, useMemo, useState } from 'react';

import {

  ActivityIndicator,

  Alert,

  Modal,

  Pressable,

  StyleSheet,

  Text,

  TextInput,

  View

} from 'react-native';

import { useRouter } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GradientPressable from '../../src/components/GradientPressable';

import ProfileAvatarPickerModal from '../../src/components/ProfileAvatarPickerModal';

import ProfileAuthenticatedScroll from '../../src/components/ProfileAuthenticatedScroll';

import TabHeaderGradient from '../../src/components/TabHeaderGradient';

import {
  curvedBodySection,
  curvedHeaderText,
  curvedTabScreen
} from '../../src/components/curvedTabScreen';

import { useAuth } from '../../src/context/AuthContext';

import {

  fetchAuthProfile,

  getAccessToken,

  updateAuthProfile

} from '../../src/lib/api';

import {

  getProfileAvatarUrl,

  getProfileInitials,

  normalizeProfileUser,

  type ProfileIcon

} from '../../src/lib/profileAvatar';

import { useTabBarContentInset } from '../../src/constants/tabBarLayout';

import { colors } from '../../src/theme';

function formatRoleLabel(role: unknown): string {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (normalized === 'admin') return 'Quản trị viên';
  if (normalized === 'moderator') return 'Điều hành viên';
  if (normalized === 'user') return 'Người dùng';
  if (typeof role === 'string' && role.trim()) return role.trim();
  return 'Người dùng';
}

export default function ProfileScreen() {

  const insets = useSafeAreaInsets();

  const tabBarInset = useTabBarContentInset();

  const router = useRouter();

  const { user, signOut, refreshUser, isAuthenticated, isLoading } = useAuth();



  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  const [savingAvatar, setSavingAvatar] = useState(false);

  const [editFullName, setEditFullName] = useState('');

  const [editEmail, setEditEmail] = useState('');

  const [editPhone, setEditPhone] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(
    async (isRefresh = false) => {
      if (!isAuthenticated) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        if (!token) return;
        const raw = await fetchAuthProfile();
        setProfile(normalizeProfileUser(raw));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tải được hồ sơ');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    void loadProfile(false);
  }, [loadProfile]);

  const handleRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    setError(null);
    const startedAt = Date.now();
    const minVisibleMs = 500;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const raw = await fetchAuthProfile();
      setProfile(normalizeProfileUser(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu');
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      setRefreshing(false);
    }
  }, [isAuthenticated]);



  const merged = useMemo(

    () => (isAuthenticated ? { ...user, ...profile } : null),

    [isAuthenticated, user, profile]

  );



  const name =

    (merged?.full_name as string) ||

    (merged?.username as string) ||

    'Người dùng';

  const username = (merged?.username as string)?.trim() || '—';

  const email = (merged?.email as string) || '—';

  const phone = (merged?.phone as string) || '—';

  const roleLabel = formatRoleLabel(merged?.role);

  const avatarKey = (merged?.avatar as string) || null;

  const avatarUrl = getProfileAvatarUrl(avatarKey);

  const initials = getProfileInitials(

    merged?.full_name as string,

    merged?.username as string

  );



  async function handleLogout() {

    await signOut();

    await refreshUser();

    setProfile(null);

  }



  function openEdit() {

    if (!merged) return;

    setEditFullName((merged.full_name as string) || '');

    setEditEmail((merged.email as string) || '');

    setEditPhone((merged.phone as string) || '');

    setEditOpen(true);

  }



  async function onSaveProfile() {

    setSaving(true);

    try {

      const res = await updateAuthProfile({

        full_name: editFullName.trim(),

        email: editEmail.trim(),

        phone: editPhone.trim()

      });

      if (!res?.success) throw new Error(res?.error || 'Cập nhật hồ sơ thất bại');

      const raw = await fetchAuthProfile();

      setProfile(normalizeProfileUser(raw));

      await refreshUser();

      setEditOpen(false);

    } catch (e) {

      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Cập nhật hồ sơ thất bại');

    } finally {

      setSaving(false);

    }

  }



  async function onSelectAvatar(icon: ProfileIcon) {

    setSavingAvatar(true);

    try {

      const res = await updateAuthProfile({ avatar: icon.name });

      if (!res?.success) throw new Error(res?.error || 'Đổi ảnh thất bại');

      const raw = await fetchAuthProfile();

      setProfile(normalizeProfileUser(raw));

      await refreshUser();

      setAvatarPickerOpen(false);

    } catch (e) {

      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Đổi ảnh thất bại');

    } finally {

      setSavingAvatar(false);

    }

  }



  if (isLoading) {

    return (

      <View style={styles.centered}>

        <ActivityIndicator color={colors.primary} size="large" />

      </View>

    );

  }



  return (

    <View style={styles.container}>

      {isAuthenticated ? (

        <ProfileAuthenticatedScroll
          tabBarInset={tabBarInset}
          loading={loading}
          error={error}
          name={name}
          username={username}
          email={email}
          phone={phone}
          roleLabel={roleLabel}
          avatarUrl={avatarUrl}
          initials={initials}
          onPressAvatar={() => setAvatarPickerOpen(true)}
          onPressEdit={openEdit}
          onLogout={handleLogout}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />

      ) : (

        <View style={styles.guestWrap}>

          <View style={[styles.topSection, { paddingTop: insets.top + 12 }]}>

            <TabHeaderGradient />

            <Text style={[curvedHeaderText.topTitle, styles.topTitleSpacing]}>Tài khoản</Text>

          </View>

          <View style={styles.guestBody}>

            <Text style={styles.guestTitle}>Chưa đăng nhập</Text>

            <Text style={styles.guestHint}>

              Đăng nhập để xem hồ sơ và báo cáo đầy đủ trên FloodSight.

            </Text>

            <GradientPressable style={styles.loginBtn} onPress={() => router.push('/login')}>

              <Text style={styles.loginBtnText}>Đăng nhập</Text>

            </GradientPressable>

          </View>

        </View>

      )}



      <ProfileAvatarPickerModal

        visible={avatarPickerOpen}

        currentAvatar={avatarKey}

        onClose={() => !savingAvatar && setAvatarPickerOpen(false)}

        onSelect={onSelectAvatar}

        saving={savingAvatar}

      />



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

              <GradientPressable style={styles.saveBtn} onPress={onSaveProfile} disabled={saving}>

                <Text style={styles.saveText}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>

              </GradientPressable>

            </View>

          </View>

        </View>

      </Modal>

    </View>

  );

}



const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: '#e9f2fb' },
  guestWrap: { flex: 1 },

  topSection: {

    position: 'relative',

    overflow: 'hidden',

    paddingHorizontal: curvedTabScreen.headerPaddingHorizontal,

    paddingBottom: curvedTabScreen.headerPaddingBottom

  },

  topTitleSpacing: { marginBottom: 0 },

  guestBody: {
    ...curvedBodySection('#f2f2f7'),
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12
  },

  guestTitle: { fontSize: 20, fontWeight: '700', color: colors.text },

  guestHint: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },

  loginBtn: { marginTop: 8, paddingVertical: 14, width: '100%' },

  loginBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  cancelText: { color: '#334155', fontWeight: '600' },

  saveBtn: { paddingHorizontal: 14, paddingVertical: 9 },

  saveText: { color: '#fff', fontWeight: '700' }

});


