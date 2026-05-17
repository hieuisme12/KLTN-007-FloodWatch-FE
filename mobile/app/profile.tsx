import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { fetchAuthProfile, getAccessToken } from '../src/lib/api';
import { colors } from '../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      try {
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
  }, [router]);

  async function handleLogout() {
    await signOut();
    await refreshUser();
    router.replace('/');
  }

  const merged = { ...user, ...profile };
  const name =
    (merged.full_name as string) ||
    (merged.username as string) ||
    'Người dùng';
  const email = (merged.email as string) || '—';
  const phone = (merged.phone as string) || '—';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{name}</Text>
        <Row label="Email" value={email} />
        <Row label="SĐT" value={phone} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
    </View>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 16
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text
  },
  row: {
    gap: 2
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textMuted
  },
  rowValue: {
    fontSize: 16,
    color: colors.text
  },
  error: {
    color: colors.danger,
    fontSize: 14
  },
  logoutButton: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
