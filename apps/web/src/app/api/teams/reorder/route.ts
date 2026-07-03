import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { BadRequestError, requireUser } from '@/lib/http';
import { reorderTeamsSchema } from '@/lib/schemas';
import { reorderTeamsForUser } from '@/server/teams';

export async function PUT(req: Request) {
  try {
    const { userId } = await requireUser(req);
    const body = await req.json();
    const payload = reorderTeamsSchema.safeParse(body);
    if (!payload.success) {
      throw new BadRequestError('並び順を確認してください');
    }

    await reorderTeamsForUser(userId, payload.data.teamIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
