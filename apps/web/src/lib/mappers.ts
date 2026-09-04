import type {
  Category as PrismaCategory,
  Project as PrismaProject,
  SubTask as PrismaSubTask,
  Task as PrismaTask,
  User as PrismaUser,
} from '@prisma/client';
import type {
  Category,
  DueType,
  PriorityLevel,
  Project,
  RepeatType,
  SubTask,
  Task,
  TaskScope,
  TaskStatus,
  TaskWeight,
  User,
} from '@todon/shared';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function mapUser(row: Pick<PrismaUser, 'id' | 'email' | 'name' | 'createdAt'>): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapCategory(row: PrismaCategory): Category {
  return {
    id: row.id,
    userId: row.userId,
    teamId: null,
    name: row.name,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapSubTask(row: PrismaSubTask): SubTask {
  return {
    id: row.id,
    taskId: row.taskId,
    title: row.title,
    completed: row.completed,
    points: row.points,
    completedById: row.completedById,
    completedAt: toIso(row.completedAt),
    order: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapProject(row: PrismaProject): Project {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapTask(
  row: PrismaTask & {
    category?: PrismaCategory | null;
    project?: PrismaProject | null;
    subtasks?: PrismaSubTask[];
  },
): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    scope: row.scope as TaskScope,
    teamId: row.teamId,
    ownerId: row.ownerId,
    assigneeId: row.assigneeId,
    status: row.status as TaskStatus,
    dueType: row.dueType as DueType,
    dueAt: toIso(row.dueAt),
    repeatType: row.repeatType as RepeatType,
    repeatIntervalDays: row.repeatIntervalDays,
    flexibleMinDays: row.flexibleMinDays,
    flexibleMaxDays: row.flexibleMaxDays,
    flexibleSkipCount: row.flexibleSkipCount,
    lastCompletedAt: toIso(row.lastCompletedAt),
    importance: row.importance as PriorityLevel,
    urgency: row.urgency as PriorityLevel,
    categoryId: row.categoryId,
    projectId: row.projectId,
    startAt: toIso(row.startAt),
    weight: row.weight as TaskWeight,
    points: row.points,
    archivedAt: toIso(row.archivedAt),
    deletedAt: toIso(row.deletedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    category: row.category ? mapCategory(row.category) : null,
    project: row.project ? mapProject(row.project) : null,
    subtasks: row.subtasks?.map(mapSubTask),
  };
}
