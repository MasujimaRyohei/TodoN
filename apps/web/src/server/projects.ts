import type { Project } from '@todon/shared';

import { BadRequestError, NotFoundError } from '@/lib/http';
import type { AppScope } from '@/lib/scope-preferences';
import { mapTask } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

import { requireMembership } from './team-access';
import { taskInclude } from './task-queries';

function mapProject(
  row: {
    id: string;
    userId: string;
    scope: string;
    teamId: string | null;
    name: string;
    description: string | null;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  taskCount?: number,
): Project {
  return {
    id: row.id,
    userId: row.userId,
    scope: row.scope as Project['scope'],
    teamId: row.teamId,
    name: row.name,
    description: row.description,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    taskCount,
  };
}

export async function listProjects(userId: string, scope: AppScope) {
  if (scope.mode === 'team') {
    await requireMembership(userId, scope.teamId);

    const rows = await prisma.project.findMany({
      where: { scope: 'team', teamId: scope.teamId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((r) => mapProject(r, r._count.tasks));
  }

  const rows = await prisma.project.findMany({
    where: { userId, scope: 'personal', teamId: null },
    include: { _count: { select: { tasks: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return rows.map((r) => mapProject(r, r._count.tasks));
}

export async function getProject(userId: string, projectId: string) {
  const row = await prisma.project.findFirst({
    where: { id: projectId },
    include: {
      _count: { select: { tasks: true } },
      tasks: {
        where: { deletedAt: null, archivedAt: null },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        include: taskInclude,
      },
    },
  });

  if (!row) {
    throw new NotFoundError('プロジェクトが見つかりません');
  }

  if (row.scope === 'team') {
    if (!row.teamId) {
      throw new NotFoundError('プロジェクトが見つかりません');
    }
    await requireMembership(userId, row.teamId);
  } else if (row.userId !== userId) {
    throw new NotFoundError('プロジェクトが見つかりません');
  }

  return {
    ...mapProject(row, row._count.tasks),
    tasks: row.tasks.map(mapTask),
  };
}

export async function createProject(
  userId: string,
  input: {
    name: string;
    description?: string | null;
    color?: string | null;
    teamId?: string | null;
  },
) {
  const name = input.name.trim();
  if (!name) {
    throw new BadRequestError('プロジェクト名を入力してください');
  }

  if (input.teamId) {
    await requireMembership(userId, input.teamId);

    const row = await prisma.project.create({
      data: {
        userId,
        scope: 'team',
        teamId: input.teamId,
        name,
        description: input.description ?? null,
        color: input.color ?? null,
      },
    });

    return mapProject(row, 0);
  }

  const row = await prisma.project.create({
    data: {
      userId,
      scope: 'personal',
      name,
      description: input.description ?? null,
      color: input.color ?? null,
    },
  });

  return mapProject(row, 0);
}
