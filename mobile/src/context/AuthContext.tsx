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
  getAccessToken,
  getStoredUser,
  loginWithCredentials,
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
    setUser(stored);
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const data = await loginWithCredentials(username, password);
      setHasToken(true);
      const nextUser =
        (data.user as Record<string, unknown>) || (await getStoredUser());
      setUser(nextUser);
    },
    []
  );

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
