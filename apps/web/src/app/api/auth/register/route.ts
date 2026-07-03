import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { COOKIE_NAME, signUserToken } from '@/lib/auth/jwt';
import { BadRequestError } from '@/lib/http';
import { mapUser } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/schemas';
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
    const payload = registerSchema.safeParse(await req.json());
    if (!payload.success) {
      throw new BadRequestError('入力内容を確認してください');
    }

    const existing = await prisma.user.findUnique({ where: { email: payload.data.email.toLowerCase() } });
    if (existing) {
      throw new BadRequestError('このメールアドレスはすでに使われています');
    }

    const supabase = await createRouteHandlerClient();
    const { data, error } = await supabase.auth.signUp({
      email: payload.data.email,
      password: payload.data.password,
      options: {
        data: {
          name: payload.data.name ?? null,
        },
      },
    });

    if (error || !data.user) {
      throw new BadRequestError(error?.message ?? '登録に失敗しました');
    }

    const user = await upsertUserFromSupabase({
      supabaseId: data.user.id,
      email: payload.data.email,
      name: payload.data.name,
    });

    const token = await signUserToken(user.id);
    const res = NextResponse.json({ user: mapUser(user), token });

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
