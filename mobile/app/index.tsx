import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { fetchActiveAlertsCount } from '../src/lib/api';
import { API_BASE_URL } from '../src/lib/config';
import { colors } from '../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuth();
  const [alertsCount, setAlertsCount] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [checkingApi, setCheckingApi] = useState(true);

  const loadAlerts = useCallback(async () => {
    setCheckingApi(true);
    setApiError(null);
    try {
      const count = await fetchActiveAlertsCount();
      setAlertsCount(count);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Không kết nối được API');
      setAlertsCount(null);
    } finally {
      setCheckingApi(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const displayName =
    (user?.full_name as string) ||
    (user?.username as string) ||
    (user?.email as string) ||
    'Khách';

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.brand}>FloodSight</Text>
        <Text style={styles.subtitle}>Cảnh báo ngập TP.HCM — bản mobile</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Xin chào</Text>
          <Text style={styles.cardValue}>{displayName}</Text>
          {!isAuthenticated ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.primaryButtonText}>Đăng nhập</Text>
            </Pressable>
          ) : (
            <Link href="/profile" asChild>
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Tài khoản</Text>
              </Pressable>
            </Link>
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>API</Text>
        <Text style={styles.apiUrl} numberOfLines={2}>
          {API_BASE_URL}
        </Text>
        {checkingApi ? (
          <ActivityIndicator style={styles.mt} color={colors.primary} />
        ) : apiError ? (
          <Text style={styles.error}>{apiError}</Text>
        ) : (
          <Text style={styles.cardValue}>
            Cảnh báo đang hoạt động: {alertsCount ?? 0}
          </Text>
        )}
        <Pressable style={styles.linkButton} onPress={loadAlerts}>
          <Text style={styles.linkButtonText}>Thử lại kết nối</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Đây là app Expo trong monorepo — map và các màn web sẽ được port dần
        sang React Native.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16
  },
  hero: {
    paddingVertical: 8
  },
  brand: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryDark
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: colors.textMuted
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  apiUrl: {
    fontSize: 12,
    color: colors.textMuted
  },
  mt: { marginTop: 12 },
  error: {
    marginTop: 8,
    color: colors.danger,
    fontSize: 14
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  secondaryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16
  },
  linkButton: {
    marginTop: 12,
    alignSelf: 'flex-start'
  },
  linkButtonText: {
    color: colors.primary,
    fontWeight: '500'
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20
  }
});
