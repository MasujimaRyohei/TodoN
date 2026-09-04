import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { BadRequestError, UnauthorizedError } from '@/lib/http';
import { mapUser } from '@/lib/mappers';
import { loginSchema } from '@/lib/schemas';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { upsertUserFromSupabase } from '@/lib/supabase/sync-user';

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

    if (error || !data.user || !data.session) {
      throw new UnauthorizedError('メールアドレスまたはパスワードが正しくありません');
    }

    const user = await upsertUserFromSupabase({
      supabaseId: data.user.id,
      email,
      name: typeof data.user.user_metadata?.name === 'string' ? data.user.user_metadata.name : null,
    });

    return NextResponse.json({
      user: mapUser(user),
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
