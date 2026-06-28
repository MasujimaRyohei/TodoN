import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { requireUser } from '@/lib/http';
import { parseScopeCookie, SCOPE_COOKIE_NAME } from '@/lib/scope-preferences';
import { buildDashboard } from '@/server/dashboard';

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser(req);
    const cookie = req.headers.get('cookie') ?? '';
    const match = cookie.match(new RegExp(`${SCOPE_COOKIE_NAME}=([^;]+)`));
    const scope = parseScopeCookie(match?.[1] ? decodeURIComponent(match[1]) : null) ?? { mode: 'personal' as const };

    const dash = await buildDashboard(userId, scope);

    return NextResponse.json(dash);
  } catch (error) {
    return handleApiError(error);
  }
}
