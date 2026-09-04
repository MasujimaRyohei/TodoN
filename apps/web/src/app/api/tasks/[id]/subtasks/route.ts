import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { BadRequestError, requireUser } from '@/lib/http';
import { createSubtaskSchema } from '@/lib/schemas';
import { createSubtask } from '@/server/tasks';

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { userId } = await requireUser(req);
    const { id } = await ctx.params;

    const body = await req.json();
    const payload = createSubtaskSchema.safeParse(body);
    if (!payload.success) {
      throw new BadRequestError('サブタスク名を確認してください');
    }

    const subtask = await createSubtask(userId, id, payload.data);

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
