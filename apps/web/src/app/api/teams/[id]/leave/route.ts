import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { requireUser } from '@/lib/http';
import { leaveTeam } from '@/server/teams';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { userId } = await requireUser(req);
    const { id } = await ctx.params;
    await leaveTeam(userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
