import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { COOKIE_NAME, signUserToken } from '@/lib/auth/jwt';
import { BadRequestError, UnauthorizedError } from '@/lib/http';
import { mapUser } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/schemas';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { upsertUserFromSupabase } from '@/lib/supabase/sync-user';

function authCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: isProd,
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function POST(req: Request) {
  try {
    const payload = loginSchema.safeParse(await req.json());
    if (!payload.success) {
      throw new BadRequestError('入力内容を確認してください');
    }

    const email = payload.data.email.toLowerCase();
    const supabase = await createRouteHandlerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: payload.data.password,
    });

    if (!error && data.user) {
      const user = await upsertUserFromSupabase({
        supabaseId: data.user.id,
        email,
        name: typeof data.user.user_metadata?.name === 'string' ? data.user.user_metadata.name : null,
      });

      const token = await signUserToken(user.id);
      const res = NextResponse.json({ user: mapUser(user), token });
      res.cookies.set({ name: COOKIE_NAME, value: token, ...authCookieOptions() });
      return res;
    }

    const legacyUser = await prisma.user.findUnique({ where: { email } });
    if (!legacyUser?.passwordHash) {
      throw new UnauthorizedError('メールアドレスまたはパスワードが正しくありません');
    }

    const ok = await bcrypt.compare(payload.data.password, legacyUser.passwordHash);
    if (!ok) {
      throw new UnauthorizedError('メールアドレスまたはパスワードが正しくありません');
    }

    const token = await signUserToken(legacyUser.id);
    const res = NextResponse.json({
      user: mapUser(legacyUser),
      token,
    });

    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      ...authCookieOptions(),
    });

    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
