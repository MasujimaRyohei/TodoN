import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { requireUser } from '@/lib/http';
import { getTeamMemberPoints } from '@/server/team-points';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { userId } = await requireUser(req);
    const { id } = await ctx.params;

    const payload = await getTeamMemberPoints(userId, id);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
