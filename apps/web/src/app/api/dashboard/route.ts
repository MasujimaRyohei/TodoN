import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { requireUser } from '@/lib/http';
import { parseScopeCookie, SCOPE_COOKIE_NAME, serializeScopeCookie } from '@/lib/scope-preferences';
import { resolveAppScopeForUser } from '@/lib/scope-server';
import { buildDashboard } from '@/server/dashboard';

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser(req);
    const cookie = req.headers.get('cookie') ?? '';
    const match = cookie.match(new RegExp(`${SCOPE_COOKIE_NAME}=([^;]+)`));
    const scope = parseScopeCookie(match?.[1] ? decodeURIComponent(match[1]) : null) ?? { mode: 'personal' as const };
    const { scope: validated, scopeInvalidated: invalidated } = await resolveAppScopeForUser(userId, scope);

    const dash = await buildDashboard(userId, validated);
    const res = NextResponse.json(dash);

    if (invalidated) {
      res.cookies.set(SCOPE_COOKIE_NAME, serializeScopeCookie(validated), {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }

    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
