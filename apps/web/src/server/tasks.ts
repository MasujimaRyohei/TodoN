import type { RepeatType, TaskWithPeople } from '@todon/shared';
import { fitsSubtaskBudget, resolveTaskPoints, subtaskBudget } from '@todon/shared';

import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/http';
import { mapSubTask, mapTask } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

import { logTaskActivity } from './activity';
import { notifyTaskDone } from './integrations';
import { enrichTaskWithPeople, fetchTaskDetail, mapTaskRows, taskInclude } from './task-queries';
import { buildRepeatCompletionPatch, repeatFieldsFromInput } from './tasks-shared';
import { requireMainTaskCreator, requireTaskAccess, requireTaskEdit } from './team-access';
import { createTeamTask } from './team-tasks';

export { buildRepeatCompletionPatch, repeatFieldsFromInput };

export async function listTasks(userId: string, archived: boolean) {
  const rows = await prisma.task.findMany({
    where: {
      userId,
      scope: 'personal',
      deletedAt: null,
      ...(archived ? { archivedAt: { not: null } } : { archivedAt: null }),
    },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    include: taskInclude,
  });

  return mapTaskRows(rows);
}

export async function getTask(userId: string, taskId: string): Promise<TaskWithPeople> {
  await requireTaskAccess(userId, taskId);

  const row = await fetchTaskDetail(taskId);
  if (!row) {
    throw new NotFoundError('タスクが見つかりません');
  }

  return enrichTaskWithPeople(row);
}

async function getActiveTask(userId: string, taskId: string) {
  const task = await getTask(userId, taskId);
  if (task.archivedAt) {
    throw new BadRequestError('このタスクはアーカイブ済みです');
  }

  return task;
}

export async function createTask(
  userId: string,
  input: {
    title: string;
    description?: string | null;
    status?: string;
    dueType?: string;
    dueAt?: Date | null;
    importance?: string;
    urgency?: string;
    weight?: string;
    points?: number | null;
    categoryId?: string | null;
    repeatType?: RepeatType;
    repeatIntervalDays?: number | null;
    flexibleMinDays?: number | null;
    flexibleMaxDays?: number | null;
    scope?: 'personal' | 'team';
    teamId?: string | null;
    assigneeId?: string | null;
    projectId?: string | null;
    startAt?: Date | null;
  },
) {
  if (input.scope === 'team') {
    if (!input.teamId) {
      throw new BadRequestError('チームタスクには teamId が必要です');
    }

    return createTeamTask(userId, input.teamId, input);
  }

  const repeat = repeatFieldsFromInput(input);

  if (input.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, userId },
    });
    if (!category) {
      throw new ForbiddenError('カテゴリが見つかりません');
    }
  }

  if (input.projectId) {
    const project = await prisma.project.findFirst({ where: { id: input.projectId, userId } });
    if (!project) {
      throw new ForbiddenError('プロジェクトが見つかりません');
    }
  }

  const row = await prisma.task.create({
    data: {
      userId,
      ownerId: userId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'todo',
      dueType: repeat.dueType ?? input.dueType ?? 'none',
      dueAt: input.dueAt ?? null,
      importance: input.importance ?? 'medium',
      urgency: input.urgency ?? 'medium',
      weight: input.weight ?? 'normal',
      points: resolveTaskPoints(input.weight ?? 'normal', input.points),
      categoryId: input.categoryId ?? null,
      projectId: input.projectId ?? null,
      startAt: input.startAt ?? null,
      repeatType: repeat.repeatType,
      repeatIntervalDays: repeat.repeatIntervalDays,
      flexibleMinDays: repeat.flexibleMinDays,
      flexibleMaxDays: repeat.flexibleMaxDays,
      scope: 'personal',
    },
    include: taskInclude,
  });

  return mapTask(row);
}

export async function updateTask(
  userId: string,
  taskId: string,
  patch: Partial<{
    title: string;
    description: string | null;
    status: string;
    dueType: string;
    dueAt: Date | null;
    importance: string;
    urgency: string;
    weight: string;
    points: number;
    categoryId: string | null;
    assigneeId: string | null;
    projectId?: string | null;
    startAt?: Date | null;
    repeatType?: string;
    repeatIntervalDays?: number | null;
    flexibleMinDays?: number | null;
    flexibleMaxDays?: number | null;
    archivedAt?: Date | null;
    deletedAt?: Date | null;
  }>,
) {
  const existing = await requireTaskEdit(userId, taskId);

  if (existing.archivedAt) {
    throw new BadRequestError('アーカイブ済みのタスクは編集できません');
  }

  if (patch.assigneeId !== undefined && existing.scope === 'team' && existing.teamId) {
    if (patch.assigneeId) {
      const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: existing.teamId, userId: patch.assigneeId } },
      });
      if (!member) {
        throw new BadRequestError('担当者はチームメンバーから選んでください');
      }
    }
  }

  if (patch.categoryId && existing.scope === 'personal') {
    const category = await prisma.category.findFirst({
      where: { id: patch.categoryId, userId },
    });
    if (!category) {
      throw new ForbiddenError('カテゴリが見つかりません');
    }
  }

  if (patch.points !== undefined) {
    if (existing.scope === 'team' && existing.teamId) {
      await requireMainTaskCreator(userId, existing.teamId);
    }

    const subs = await prisma.subTask.findMany({
      where: { taskId },
      select: { id: true, points: true },
    });
    const { allocated } = subtaskBudget(patch.points, subs);
    if (allocated > patch.points) {
      throw new BadRequestError(
        `サブタスクに割り当て済みのポイント(${allocated})を下回る値にはできません`,
      );
    }
  }

  const completing = patch.status === 'done' && existing.status !== 'done';

  const repeatPatch =
    patch.repeatType !== undefined
      ? repeatFieldsFromInput({
          repeatType: patch.repeatType as RepeatType,
          repeatIntervalDays: patch.repeatIntervalDays,
          flexibleMinDays: patch.flexibleMinDays,
          flexibleMaxDays: patch.flexibleMaxDays,
          dueType: patch.dueType,
        })
      : null;

  const row = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.status !== undefined && !completing ? { status: patch.status } : {}),
      ...(patch.dueType !== undefined ? { dueType: patch.dueType } : {}),
      ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt } : {}),
      ...(patch.importance !== undefined ? { importance: patch.importance } : {}),
      ...(patch.urgency !== undefined ? { urgency: patch.urgency } : {}),
      ...(patch.weight !== undefined ? { weight: patch.weight } : {}),
      ...(patch.points !== undefined ? { points: patch.points } : {}),
      ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
      ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}),
      ...(patch.projectId !== undefined ? { projectId: patch.projectId } : {}),
      ...(patch.startAt !== undefined ? { startAt: patch.startAt } : {}),
      ...(patch.archivedAt !== undefined ? { archivedAt: patch.archivedAt } : {}),
      ...(patch.deletedAt !== undefined ? { deletedAt: patch.deletedAt } : {}),
      ...(repeatPatch
        ? {
            repeatType: repeatPatch.repeatType,
            repeatIntervalDays: repeatPatch.repeatIntervalDays,
            flexibleMinDays: repeatPatch.flexibleMinDays,
            flexibleMaxDays: repeatPatch.flexibleMaxDays,
          }
        : {}),
      ...(completing ? buildRepeatCompletionPatch(existing) : {}),
    },
    include: taskInclude,
  });

  if (patch.status !== undefined && patch.status !== existing.status) {
    await logTaskActivity({
      taskId,
      userId,
      action: 'status_changed',
      before: existing.status,
      after: patch.status,
    });
  }

  if (patch.assigneeId !== undefined && patch.assigneeId !== existing.assigneeId) {
    await logTaskActivity({
      taskId,
      userId,
      action: 'assignee_changed',
      before: existing.assigneeId,
      after: patch.assigneeId,
    });
  }

  const result = await enrichTaskWithPeople(row);
  if (result.status === 'done' && existing.status !== 'done') {
    void notifyTaskDone(userId, result.title);
  }

  return result;
}

export async function archiveTask(userId: string, taskId: string) {
  await getActiveTask(userId, taskId);

  const row = await prisma.task.update({
    where: { id: taskId },
    data: { archivedAt: new Date(), updatedAt: new Date() },
    include: taskInclude,
  });

  await logTaskActivity({ taskId, userId, action: 'archived' });

  return enrichTaskWithPeople(row);
}

export async function deleteArchivedTask(userId: string, taskId: string) {
  const task = await requireTaskEdit(userId, taskId);

  if (!task.archivedAt) {
    throw new BadRequestError('アーカイブ済みのタスクのみ削除できます');
  }

  const row = await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
    include: taskInclude,
  });

  await logTaskActivity({ taskId, userId, action: 'deleted' });

  return enrichTaskWithPeople(row);
}

export async function createSubtask(
  userId: string,
  taskId: string,
  input: { title: string; points?: number },
) {
  const task = await getActiveTask(userId, taskId);
  await requireTaskEdit(userId, taskId);

  const points = input.points ?? 0;
  if (points > 0) {
    const siblings = await prisma.subTask.findMany({
      where: { taskId },
      select: { id: true, points: true },
    });
    if (!fitsSubtaskBudget(task.points, siblings, points)) {
      const { remaining } = subtaskBudget(task.points, siblings);
      throw new BadRequestError(`割り当て可能なポイントを超えています（残り ${remaining}）`);
    }
  }

  const last = await prisma.subTask.findFirst({
    where: { taskId },
    orderBy: { sortOrder: 'desc' },
  });

  const nextOrder = last ? last.sortOrder + 1 : 0;

  const row = await prisma.subTask.create({
    data: {
      taskId,
      title: input.title,
      points,
      sortOrder: nextOrder,
    },
  });

  await logTaskActivity({ taskId, userId, action: 'subtask_added', after: input.title });

  return mapSubTask(row);
}

export async function updateSubtask(
  userId: string,
  subtaskId: string,
  patch: Partial<{ title: string; completed: boolean; points: number; order: number }>,
) {
  const subtask = await prisma.subTask.findFirst({
    where: { id: subtaskId },
    include: { task: true },
  });

  if (!subtask || subtask.task.deletedAt) {
    throw new NotFoundError('サブタスクが見つかりません');
  }

  await requireTaskEdit(userId, subtask.taskId);

  if (subtask.task.archivedAt) {
    throw new BadRequestError('アーカイブ済みタスクは編集できません');
  }

  if (patch.points !== undefined && patch.points !== subtask.points) {
    const siblings = await prisma.subTask.findMany({
      where: { taskId: subtask.taskId },
      select: { id: true, points: true },
    });
    if (!fitsSubtaskBudget(subtask.task.points, siblings, patch.points, subtaskId)) {
      const { remaining } = subtaskBudget(subtask.task.points, siblings, subtaskId);
      throw new BadRequestError(`割り当て可能なポイントを超えています（残り ${remaining}）`);
    }
  }

  const togglingCompletion = patch.completed !== undefined && patch.completed !== subtask.completed;

  const row = await prisma.subTask.update({
    where: { id: subtaskId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.completed !== undefined ? { completed: patch.completed } : {}),
      ...(patch.points !== undefined ? { points: patch.points } : {}),
      ...(patch.order !== undefined ? { sortOrder: patch.order } : {}),
      ...(togglingCompletion
        ? patch.completed
          ? { completedById: userId, completedAt: new Date() }
          : { completedById: null, completedAt: null }
        : {}),
      updatedAt: new Date(),
    },
  });

  return mapSubTask(row);
}

export async function skipFlexibleTask(userId: string, taskId: string) {
  const existing = await requireTaskEdit(userId, taskId);

  if (existing.repeatType !== 'flexible') {
    throw new BadRequestError('だいたいリピートのタスクのみスキップできます');
  }

  const row = await prisma.task.update({
    where: { id: taskId },
    data: {
      flexibleSkipCount: { increment: 1 },
      updatedAt: new Date(),
    },
    include: taskInclude,
  });

  return enrichTaskWithPeople(row);
}
