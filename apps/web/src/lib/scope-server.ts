import { cache } from 'react';
import { cookies } from 'next/headers';

import type { AppScope } from '@/lib/scope-preferences';
import { SCOPE_COOKIE_NAME, parseScopeCookie } from '@/lib/scope-preferences';
import { getMembership } from '@/server/team-access';

export type ValidatedAppScope = {
  scope: AppScope;
  scopeInvalidated: boolean;
};

export async function getServerAppScope(): Promise<AppScope> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SCOPE_COOKIE_NAME)?.value;
  return parseScopeCookie(raw) ?? { mode: 'personal' };
}

export async function resolveAppScopeForUser(
  userId: string,
  scope: AppScope,
): Promise<ValidatedAppScope> {
  if (scope.mode !== 'team') {
    return { scope, scopeInvalidated: false };
  }

  const membership = await getMembership(userId, scope.teamId);
  if (membership) {
    return { scope, scopeInvalidated: false };
  }

  return { scope: { mode: 'personal' }, scopeInvalidated: true };
}

export const getValidatedServerAppScope = cache(
  async (userId: string): Promise<ValidatedAppScope> => {
    const current = await getServerAppScope();
    return resolveAppScopeForUser(userId, current);
  },
);
