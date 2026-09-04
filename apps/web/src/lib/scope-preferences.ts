export type AppScope =
  | { mode: 'personal' }
  | { mode: 'team'; teamId: string; teamName?: string; teamIcon?: string | null };

export const SCOPE_STORAGE_KEY = 'todon:app-scope';
export const SCOPE_COOKIE_NAME = 'todon_scope';
export const SCOPE_CHANGE_EVENT = 'todon:scope-change';

export function parseScopeCookie(raw: string | undefined | null): AppScope | null {
  if (!raw || raw === 'personal') {
    return raw === 'personal' ? { mode: 'personal' } : null;
  }

  if (raw.startsWith('team:')) {
    const teamId = raw.slice(5);
    if (teamId) {
      return { mode: 'team', teamId };
    }
  }

  return null;
}

export function serializeScopeCookie(scope: AppScope): string {
  return scope.mode === 'personal' ? 'personal' : `team:${scope.teamId}`;
}

export function readScopeFromCookie(): AppScope | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SCOPE_COOKIE_NAME}=([^;]+)`));
  return parseScopeCookie(match?.[1] ? decodeURIComponent(match[1]) : null);
}

export function persistAppScope(scope: AppScope) {
  if (typeof window === 'undefined') {
    return;
  }

  writeAppScope(scope);
  document.cookie = `${SCOPE_COOKIE_NAME}=${serializeScopeCookie(scope)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(SCOPE_CHANGE_EVENT, { detail: scope }));
}

export function scopedHomePath(pathname: string): '/dashboard' | '/tasks' | '/projects' {
  if (pathname.startsWith('/projects')) {
    return '/projects';
  }
  if (pathname.startsWith('/tasks')) {
    return '/tasks';
  }
  return '/dashboard';
}

export function readAppScope(): AppScope | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SCOPE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AppScope;
    if (parsed.mode === 'personal') {
      return { mode: 'personal' };
    }
    if (parsed.mode === 'team' && parsed.teamId) {
      return parsed;
    }
  } catch {
    // ignore
  }

  return null;
}

export function writeAppScope(scope: AppScope) {
  window.localStorage.setItem(SCOPE_STORAGE_KEY, JSON.stringify(scope));
}

export function scopeFromPathname(pathname: string): AppScope | null {
  const match = pathname.match(/^\/teams\/([^/]+)/);
  if (match?.[1]) {
    return { mode: 'team', teamId: match[1] };
  }

  return null;
}

export function teamNavHref(scope: AppScope): '/teams' | `/teams/${string}` {
  if (scope.mode === 'team' && scope.teamId) {
    return `/teams/${scope.teamId}`;
  }

  return '/teams';
}

export function teamDisplayIcon(team: { icon?: string | null; name: string }) {
  if (team.icon?.trim()) {
    return team.icon.trim();
  }

  return team.name.trim().slice(0, 1) || '👥';
}
