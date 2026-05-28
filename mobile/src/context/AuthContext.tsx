import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  clearAuthStorage,
  fetchAuthProfile,
  getAccessToken,
  getStoredUser,
  loginWithCredentials,
  extractLoginTokenBundle,
  logout as apiLogout
} from '../lib/api';

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: Record<string, unknown> | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUserPayload(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  const root = input as Record<string, unknown>;
  const candidates = [
    root,
    root.user,
    root.data,
    (root.data as Record<string, unknown> | undefined)?.user
  ];
  for (const item of candidates) {
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      if (
        typeof obj.full_name === 'string' ||
        typeof obj.fullName === 'string' ||
        typeof obj.name === 'string' ||
        typeof obj.username === 'string' ||
        typeof obj.email === 'string'
      ) {
        return obj;
      }
    }
  }
  return root;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);

  const [hasToken, setHasToken] = useState(false);

  const refreshUser = useCallback(async () => {
    const token = await getAccessToken();
    setHasToken(Boolean(token));
    if (!token) {
      setUser(null);
      return;
    }
    const stored = await getStoredUser();
    const normalizedStored = normalizeUserPayload(stored);
    if (normalizedStored) {
      setUser(normalizedStored);
      return;
    }
    try {
      const profile = await fetchAuthProfile();
      setUser(normalizeUserPayload(profile));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const signIn = useCallback(async (username: string, password: string) => {
    const data = await loginWithCredentials(username, password);
    const token = await getAccessToken();
    setHasToken(Boolean(token));
    if (!token) {
      throw new Error(
        'Đăng nhập không lưu được phiên. Vui lòng thử lại hoặc liên hệ quản trị viên.'
      );
    }
    const envelope =
      data && typeof data === 'object'
        ? extractLoginTokenBundle(data)
        : {};
    const nextUser =
      normalizeUserPayload(envelope) ||
      normalizeUserPayload(data) ||
      normalizeUserPayload(await getStoredUser());
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setHasToken(false);
    setUser(null);
    await clearAuthStorage();
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated: hasToken,
      user,
      signIn,
      signOut,
      refreshUser
    }),
    [isLoading, hasToken, user, signIn, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
