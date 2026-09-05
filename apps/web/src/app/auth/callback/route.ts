import { NextResponse } from 'next/server';

import { createRouteHandlerClient } from '@/lib/supabase/server';

/**
 * Exchanges the `code` from a Supabase email link (recovery, confirmation) for a
 * session cookie, then forwards to `next` (defaults to the dashboard).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  // Only site-relative paths; reject protocol-relative (`//host`) and absolute URLs.
  const nextParam = url.searchParams.get('next');
  const next = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : '/dashboard';

  // Behind Vercel's proxy the request host is the deployment host; prefer the
  // forwarded host so the redirect lands on the domain the user is actually on.
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

  if (code) {
    try {
      const supabase = await createRouteHandlerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${base}${next}`);
      }
    } catch {
      // fall through to the login redirect
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
