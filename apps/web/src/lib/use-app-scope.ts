'use client';

import { useSyncExternalStore } from 'react';

import {
  type AppScope,
  readAppScope,
  readScopeFromCookie,
  SCOPE_CHANGE_EVENT,
  scopeFromPathname,
} from '@/lib/scope-preferences';

const PERSONAL_SCOPE: AppScope = { mode: 'personal' };

let cachedRaw = '';
let cachedScope: AppScope = PERSONAL_SCOPE;

function readClientScope(): AppScope {
  const next = readScopeFromCookie() ?? readAppScope() ?? PERSONAL_SCOPE;
  const raw = JSON.stringify(next);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedScope = next;
  }
  return cachedScope;
}

function subscribe(onChange: () => void) {
  window.addEventListener(SCOPE_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SCOPE_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Scope persisted in cookie / localStorage, kept in sync across components and tabs. */
export function useStoredAppScope(): AppScope {
  return useSyncExternalStore(subscribe, readClientScope, () => PERSONAL_SCOPE);
}

/** Effective scope: the team implied by the current path wins over the stored scope. */
export function useAppScope(pathname: string): AppScope {
  const stored = useStoredAppScope();
  return scopeFromPathname(pathname) ?? stored;
}
