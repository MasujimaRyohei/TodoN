import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { BadRequestError, UnauthorizedError } from '@/lib/http';
import { refreshSchema } from '@/lib/schemas';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const payload = refreshSchema.safeParse(await req.json());
    if (!payload.success) {
      throw new BadRequestError('リフレッシュトークンが必要です');
    }

    const supabase = await createRouteHandlerClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: payload.data.refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedError('セッションを更新できませんでした');
    }

    return NextResponse.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
