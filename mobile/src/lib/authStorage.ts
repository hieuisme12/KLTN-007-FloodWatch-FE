import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_STORAGE_KEYS } from '@hcm-flood/shared';

export async function getAccessToken(): Promise<string | null> {
  return (
    (await AsyncStorage.getItem(AUTH_STORAGE_KEYS.ACCESS)) ||
    (await AsyncStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_DOC))
  );
}

export async function getStoredUser(): Promise<Record<string, unknown> | null> {
  const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function persistAuthFromLoginResponse(data: Record<string, unknown>) {
  const access =
    (data.access_token as string) ||
    (data.accessToken as string) ||
    (data.token as string);
  const refresh = data.refresh_token as string | undefined;
  const session = data.session_token as string | undefined;
  const user = data.user;

  if (access) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.ACCESS, access);
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_DOC, access);
  }
  if (refresh) await AsyncStorage.setItem(AUTH_STORAGE_KEYS.REFRESH, refresh);
  if (session) await AsyncStorage.setItem(AUTH_STORAGE_KEYS.SESSION, session);
  if (user) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
  }
}

export async function clearAuthStorage() {
  await AsyncStorage.multiRemove([
    AUTH_STORAGE_KEYS.ACCESS,
    AUTH_STORAGE_KEYS.ACCESS_DOC,
    AUTH_STORAGE_KEYS.REFRESH,
    AUTH_STORAGE_KEYS.SESSION,
    AUTH_STORAGE_KEYS.USER
  ]);
}
