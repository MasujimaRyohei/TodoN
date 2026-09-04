import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { BadRequestError } from '@/lib/http';
import { mapUser } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/schemas';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { upsertUserFromSupabase } from '@/lib/supabase/sync-user';

export async function POST(req: Request) {
  try {
    const payload = registerSchema.safeParse(await req.json());
    if (!payload.success) {
      throw new BadRequestError('入力内容を確認してください');
    }

    const email = payload.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestError('このメールアドレスはすでに使われています');
    }

    const supabase = await createRouteHandlerClient();
    const { data, error } = await supabase.auth.signUp({
      email: payload.data.email,
      password: payload.data.password,
      options: { data: { name: payload.data.name ?? null } },
    });

    if (error || !data.user) {
      throw new BadRequestError(error?.message ?? '登録に失敗しました');
    }

    const user = await upsertUserFromSupabase({
      supabaseId: data.user.id,
      email,
      name: payload.data.name,
    });

    // メール確認が有効な場合は session が無い。その場合はログインを促す。
    return NextResponse.json({
      user: mapUser(user),
      token: data.session?.access_token ?? null,
      refreshToken: data.session?.refresh_token ?? null,
      needsEmailConfirmation: !data.session,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
