import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { BadRequestError, requireUser } from '@/lib/http';
import { updateSubtaskSchema } from '@/lib/schemas';
import { updateSubtask } from '@/server/tasks';

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { userId } = await requireUser(req);
    const { id } = await ctx.params;

    const body = await req.json();
    const payload = updateSubtaskSchema.safeParse(body);
    if (!payload.success) {
      throw new BadRequestError('入力内容を確認してください');
    }

    const subtask = await updateSubtask(userId, id, payload.data);

    return NextResponse.json(subtask);
  } catch (error) {
    return handleApiError(error);
  }
}
