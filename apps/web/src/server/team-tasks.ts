import type { Task } from '@todon/shared';
import type { RepeatType } from '@todon/shared';
import { resolveTaskPoints } from '@todon/shared';

import { BadRequestError, ForbiddenError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

import { logTaskActivity } from './activity';
import { enrichTaskWithPeople, mapTaskRows, taskInclude } from './task-queries';
import { repeatFieldsFromInput } from './tasks-shared';
import { requireMainTaskCreator, requireMembership, requireTeamAdmin } from './team-access';

export async function listTeamTasks(userId: string, teamId: string, archived: boolean) {
  await requireMembership(userId, teamId);

  const rows = await prisma.task.findMany({
    where: {
      teamId,
      scope: 'team',
      deletedAt: null,
      ...(archived ? { archivedAt: { not: null } } : { archivedAt: null }),
    },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    include: taskInclude,
  });

  const mapped = mapTaskRows(rows);

  const enriched = await Promise.all(
    rows.map(async (row, index) => {
      const detail = await enrichTaskWithPeople(row);
      return { ...mapped[index], owner: detail.owner, assignee: detail.assignee };
    }),
  );

  return enriched;
}

export async function createTeamTask(
  userId: string,
  teamId: string,
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
    assigneeId?: string | null;
    repeatType?: RepeatType;
    repeatIntervalDays?: number | null;
    flexibleMinDays?: number | null;
    flexibleMaxDays?: number | null;
  },
) {
  await requireMainTaskCreator(userId, teamId);

  if (input.assigneeId) {
    const assigneeMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: input.assigneeId } },
    });

    if (!assigneeMember) {
      throw new BadRequestError('担当者はチームメンバーから選んでください');
    }
  }

  const repeat = repeatFieldsFromInput(input);

  const row = await prisma.task.create({
    data: {
      userId,
      ownerId: userId,
      teamId,
      scope: 'team',
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'todo',
      dueType: repeat.dueType ?? input.dueType ?? 'none',
      dueAt: input.dueAt ?? null,
      importance: input.importance ?? 'medium',
      urgency: input.urgency ?? 'medium',
      weight: input.weight ?? 'normal',
      points: resolveTaskPoints(input.weight ?? 'normal', input.points),
      categoryId: null,
      assigneeId: input.assigneeId ?? null,
      repeatType: repeat.repeatType,
      repeatIntervalDays: repeat.repeatIntervalDays,
      flexibleMinDays: repeat.flexibleMinDays,
      flexibleMaxDays: repeat.flexibleMaxDays,
    },
    include: taskInclude,
  });

  await logTaskActivity({
    taskId: row.id,
    userId,
    action: 'task_created',
    after: row.title,
  });

  return enrichTaskWithPeople(row);
}

export async function assignTeamTask(
  actorId: string,
  teamId: string,
  taskId: string,
  assigneeId: string | null,
) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, teamId, scope: 'team', deletedAt: null },
  });

  if (!task) {
    throw new ForbiddenError('タスクが見つかりません');
  }

  await requireTeamAdmin(actorId, teamId);

  if (assigneeId) {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: assigneeId } },
    });

    if (!member) {
      throw new BadRequestError('担当者はチームメンバーから選んでください');
    }
  }

  const row = await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId, updatedAt: new Date() },
    include: taskInclude,
  });

  await logTaskActivity({
    taskId,
    userId: actorId,
    action: 'assignee_changed',
    before: task.assigneeId,
    after: assigneeId,
  });

  return enrichTaskWithPeople(row);
}

export async function listMyAssignedTeamTasks(userId: string): Promise<Task[]> {
  const teamIds = (
    await prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } })
  ).map((m) => m.teamId);

  if (teamIds.length === 0) {
    return [];
  }

  const rows = await prisma.task.findMany({
    where: {
      teamId: { in: teamIds },
      scope: 'team',
      assigneeId: userId,
      deletedAt: null,
      archivedAt: null,
      status: { notIn: ['done', 'canceled'] },
    },
    orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }],
    include: taskInclude,
    take: 20,
  });

  const enriched = await Promise.all(rows.map((row) => enrichTaskWithPeople(row)));
  return enriched;
}
