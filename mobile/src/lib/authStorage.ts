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

export async function getSessionToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_STORAGE_KEYS.SESSION);
}

/** Gom token từ mọi dạng body login BE (giống web: `response.data.data`). */
export function extractLoginTokenBundle(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {};
  const root = body as Record<string, unknown>;
  const candidates: Record<string, unknown>[] = [root];

  const data = root.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    candidates.push(data as Record<string, unknown>);
  }
  const tokens = root.tokens;
  if (tokens && typeof tokens === 'object' && !Array.isArray(tokens)) {
    candidates.push(tokens as Record<string, unknown>);
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const nestedTokens = (data as Record<string, unknown>).tokens;
    if (nestedTokens && typeof nestedTokens === 'object' && !Array.isArray(nestedTokens)) {
      candidates.push(nestedTokens as Record<string, unknown>);
    }
  }

  for (const node of candidates) {
    if (node.access_token || node.accessToken || node.token) {
      const dataObj =
        data && typeof data === 'object' && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : undefined;
      return {
        ...node,
        user: node.user ?? dataObj?.user ?? root.user
      };
    }
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return root;
}

/** @deprecated — dùng extractLoginTokenBundle */
export function unwrapAuthPayload(data: Record<string, unknown>): Record<string, unknown> {
  return extractLoginTokenBundle(data);
}

export async function persistAuthFromLoginResponse(data: Record<string, unknown>) {
  const payload = extractLoginTokenBundle(data);
  const access =
    (payload.access_token as string) ||
    (payload.accessToken as string) ||
    (payload.token as string);
  const refresh = payload.refresh_token as string | undefined;
  const session = payload.session_token as string | undefined;
  const user = payload.user;

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
