import { NextResponse } from 'next/server';

import { createRouteHandlerClient } from '@/lib/supabase/server';

/**
 * Exchanges the `code` from a Supabase email link (recovery, confirmation) for a
 * session cookie, then forwards to `next` (defaults to the dashboard).
 */
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
