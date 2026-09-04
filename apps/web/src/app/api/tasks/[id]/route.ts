import { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-utils';
import { BadRequestError, requireUser } from '@/lib/http';
import { updateTaskSchema } from '@/lib/schemas';
import { deleteArchivedTask, getTask, updateTask } from '@/server/tasks';

type RouteCtx = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const { userId } = await requireUser(req);
    const { id } = await ctx.params;

    const task = await getTask(userId, id);

    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { userId } = await requireUser(req);
    const { id } = await ctx.params;

    const body = await req.json();
    const payload = updateTaskSchema.safeParse(body);
    if (!payload.success) {
      throw new BadRequestError('入力内容を確認してください');
    }

    const parsed = payload.data;

    const task = await updateTask(userId, id, {
      ...parsed,
      dueAt:
        parsed.dueAt !== undefined ? (parsed.dueAt ? new Date(parsed.dueAt) : null) : undefined,
      startAt:
        parsed.startAt !== undefined
          ? parsed.startAt
            ? new Date(parsed.startAt)
            : null
          : undefined,
    });

    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    const { userId } = await requireUser(req);
    const { id } = await ctx.params;

    const task = await deleteArchivedTask(userId, id);

    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}
