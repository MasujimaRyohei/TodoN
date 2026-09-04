import { TodoNApiClient } from '@todon/shared';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import React from 'react';

const TOKEN_KEY = 'todon_token';

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

type AuthValue = {
  token: string | null;
  baseUrl: string;
  client: TodoNApiClient;
  hydrated: boolean;
  updateToken: (next: string | null) => Promise<void>;
};

const AuthContext = React.createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const baseUrl = React.useMemo(() => resolveBaseUrl(), []);

  const [token, setToken] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  const client = React.useMemo(
    () => new TodoNApiClient({ baseUrl, getToken: () => token }),
    [token, baseUrl],
  );

  React.useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);

        if (alive && stored) {
          setToken(stored);
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

  const updateToken = React.useCallback(async (next: string | null) => {
    if (!next) {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
      setToken(null);
      return;
    }

    await SecureStore.setItemAsync(TOKEN_KEY, next);
    setToken(next);
  }, []);

  const value = React.useMemo<AuthValue>(
    () => ({
      token,
      baseUrl,
      client,
      hydrated,
      updateToken,
    }),
    [token, baseUrl, client, hydrated, updateToken],
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
