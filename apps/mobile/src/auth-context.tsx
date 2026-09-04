import { TodoNApiClient } from '@todon/shared';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import React from 'react';

const TOKEN_KEY = 'todon_token';
const REFRESH_TOKEN_KEY = 'todon_refresh_token';

function normalizeBase(raw: unknown) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return '';
  }

  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function resolveBaseUrl() {
  const fromEnvRaw =
    typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL
      : '';

  const fromExtraRaw =
    typeof Constants.expoConfig?.extra?.apiUrl === 'string'
      ? Constants.expoConfig.extra.apiUrl
      : '';

  return normalizeBase(fromEnvRaw) || normalizeBase(fromExtraRaw);
}

type AuthTokens = { token: string | null; refreshToken?: string | null };

type AuthValue = {
  token: string | null;
  baseUrl: string;
  client: TodoNApiClient;
  hydrated: boolean;
  /** Persist a new Supabase session, or pass null to sign out. */
  applyAuth: (next: AuthTokens | null) => Promise<void>;
};

const AuthContext = React.createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const baseUrl = React.useMemo(() => resolveBaseUrl(), []);

  const [token, setToken] = React.useState<string | null>(null);
  const [refreshToken, setRefreshToken] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  const persist = React.useCallback(async (next: AuthTokens | null) => {
    if (!next || !next.token) {
      setToken(null);
      setRefreshToken(null);
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined);
      return;
    }

    setToken(next.token);
    await SecureStore.setItemAsync(TOKEN_KEY, next.token);

    if (next.refreshToken !== undefined) {
      setRefreshToken(next.refreshToken);
      if (next.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, next.refreshToken);
      } else {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined);
      }
    }
  }, []);

  const client = React.useMemo(
    () =>
      new TodoNApiClient({
        baseUrl,
        getToken: () => token,
        getRefreshToken: () => refreshToken,
        onTokensRefreshed: (tokens) => persist(tokens),
      }),
    [token, refreshToken, baseUrl, persist],
  );

  React.useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const [storedToken, storedRefresh] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        ]);

        if (alive && storedToken) {
          setToken(storedToken);
          setRefreshToken(storedRefresh ?? null);
        }
      } catch {
        // ignore
      } finally {
        if (alive) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const value = React.useMemo<AuthValue>(
    () => ({ token, baseUrl, client, hydrated, applyAuth: persist }),
    [token, baseUrl, client, hydrated, persist],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside AuthProvider');
  }

  return ctx;
}
