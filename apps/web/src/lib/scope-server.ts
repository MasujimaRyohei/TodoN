import { cookies } from 'next/headers';

import type { AppScope } from '@/lib/scope-preferences';
import { SCOPE_COOKIE_NAME, parseScopeCookie } from '@/lib/scope-preferences';

export async function getServerAppScope(): Promise<AppScope> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SCOPE_COOKIE_NAME)?.value;
  return parseScopeCookie(raw) ?? { mode: 'personal' };
}
