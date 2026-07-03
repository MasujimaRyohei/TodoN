import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { verifyUserToken } from '@/lib/auth/jwt';
import { createMiddlewareClient, updateSession } from '@/lib/supabase/middleware';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/tasks' ||
    pathname.startsWith('/tasks/') ||
    pathname === '/archive' ||
    pathname.startsWith('/archive/') ||
    pathname === '/reviews' ||
    pathname.startsWith('/reviews/') ||
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    pathname === '/calendar' ||
    pathname.startsWith('/calendar/') ||
    pathname === '/gantt' ||
    pathname.startsWith('/gantt/') ||
    pathname === '/projects' ||
    pathname.startsWith('/projects/') ||
    pathname === '/templates' ||
    pathname.startsWith('/templates/') ||
    pathname === '/habits' ||
    pathname.startsWith('/habits/') ||
    pathname === '/teams' ||
    pathname.startsWith('/teams/') ||
    pathname === '/join' ||
    pathname.startsWith('/join/');

  let response: NextResponse;

  try {
    response = await updateSession(req);
  } catch {
    response = NextResponse.next({ request: req });
  }

  if (!isProtected) {
    return response;
  }

  let authed = false;

  try {
    const supabase = createMiddlewareClient(req, response);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authed = Boolean(user);
  } catch {
    // Supabase 未設定時は JWT のみ
  }

  if (!authed) {
    const token = req.cookies.get('todon_token')?.value;
    if (token) {
      try {
        await verifyUserToken(token);
        authed = true;
      } catch {
        authed = false;
      }
    }
  }

  if (!authed) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const teamMatch = pathname.match(/^\/teams\/([^/]+)/);
  if (teamMatch?.[1] && teamMatch[1] !== 'new') {
    response.cookies.set('todon_scope', `team:${teamMatch[1]}`, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/tasks',
    '/tasks/:path*',
    '/archive',
    '/archive/:path*',
    '/reviews',
    '/reviews/:path*',
    '/teams',
    '/teams/:path*',
    '/join',
    '/join/:path*',
    '/settings',
    '/settings/:path*',
    '/calendar',
    '/calendar/:path*',
    '/gantt',
    '/gantt/:path*',
    '/projects',
    '/projects/:path*',
    '/templates',
    '/templates/:path*',
    '/habits',
    '/habits/:path*',
  ],
};
