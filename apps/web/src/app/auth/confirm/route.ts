import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { createRouteHandlerClient } from '@/lib/supabase/server';

const EMAIL_OTP_TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_OTP_TYPES as string[]).includes(value);
}

/**
 * Verifies a Supabase email link that carries `token_hash` (server-side flow) and
 * sets the session cookie, then forwards to `next`. Used by the recovery /
 * confirmation email templates:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  const nextParam = url.searchParams.get('next');
  const next = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : '/dashboard';

  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

  if (tokenHash && isEmailOtpType(type)) {
    try {
      const supabase = await createRouteHandlerClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) {
        return NextResponse.redirect(`${base}${next}`);
      }
    } catch {
      // fall through to the login redirect
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
