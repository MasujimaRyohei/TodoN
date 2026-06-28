import type { Task as PrismaTask } from '@prisma/client';
import type { AppScope } from '@/lib/scope-preferences';
import type { DashboardPayload, FlexibleTaskView, Task } from '@todon/shared';
import { buildDashboardSuggestion, computeTodayProgress, formatTodayDateLabel } from '@todon/shared';

import { endOfLocalDay, localDayKey, startOfLocalDay } from '@/lib/date';
import { mapTask } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

import { getTodayCapacity } from './capacity';
import { pickFlexibleTasksForToday } from './flexible-tasks';
import { taskInclude } from './task-queries';
import { getTeamForUser } from './teams';
import { listMyAssignedTeamTasks, listTeamTasks } from './team-tasks';

type TaskRow = PrismaTask & {
  category?: Parameters<typeof mapTask>[0]['category'];
  subtasks?: Parameters<typeof mapTask>[0]['subtasks'];
};

function mapRows(list: TaskRow[]) {
  return list.map((row) => mapTask(row));
}

function buildTodayInfo(nowInput: Date) {
  const timeZone = 'Asia/Tokyo';
  return {
    dateLabel: formatTodayDateLabel(nowInput, timeZone),
    dayKey: localDayKey(nowInput),
    serverNow: nowInput.toISOString(),
    timeZone,
  };
}

function partitionOpenTasks(rows: TaskRow[], nowInput: Date) {
  const open = rows.filter((t) => !['done', 'canceled'].includes(t.status));
  const startToday = startOfLocalDay(nowInput);
  const endToday = endOfLocalDay(nowInput);
  const soonEnd = new Date(startToday);
  soonEnd.setDate(soonEnd.getDate() + 7);
  const pendingThreshold = new Date(nowInput);
  pendingThreshold.setUTCDate(pendingThreshold.getUTCDate() - 7);

  const dueRows = open.filter((t) => t.dueType === 'datetime' && t.dueAt);

  return {
    open,
    startToday,
    endToday,
    overdue: dueRows
      .filter((t) => t.dueAt && t.dueAt < nowInput)
      .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime()),
    dueToday: dueRows
      .filter((t) => t.dueAt && t.dueAt >= startToday && t.dueAt < endToday)
      .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime()),
    dueSoon: dueRows
      .filter((t) => t.dueAt && t.dueAt >= endToday && t.dueAt < soonEnd)
      .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime()),
    inProgress: open.filter((t) => t.status === 'doing'),
    stalledPending: open
      .filter((t) => t.status === 'pending' && t.updatedAt <= pendingThreshold)
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()),
    highPriorityOpen: open
      .filter((t) => t.importance === 'high')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
  };
}

export async function buildDashboard(
  userId: string,
  scope: AppScope,
  nowInput = new Date(),
): Promise<DashboardPayload> {
  if (scope.mode === 'team') {
    return buildTeamDashboard(userId, scope.teamId, nowInput);
  }

  return buildPersonalDashboard(userId, nowInput);
}

async function buildPersonalDashboard(userId: string, nowInput: Date): Promise<DashboardPayload> {
  const rows = await prisma.task.findMany({
    where: { userId, scope: 'personal', deletedAt: null, archivedAt: null },
    include: taskInclude,
  });

  const capacity = await getTodayCapacity(userId, nowInput);
  const parts = partitionOpenTasks(rows, nowInput);
  const anytimeThreshold = new Date(nowInput);
  anytimeThreshold.setUTCDate(anytimeThreshold.getUTCDate() - 14);
  const todayHeavyTaskCount = parts.open.filter((t) => t.weight === 'heavy').length;

  const todayFlexible = pickFlexibleTasksForToday(rows, {
    now: nowInput,
    capacity,
    todayOpenTaskCount: parts.open.length,
    todayHeavyTaskCount,
  });

  const anytimeStalled = parts.open.filter(
    (t) => t.dueType === 'anytime' && t.createdAt <= anytimeThreshold,
  );

  const aiSuggestion = buildDashboardSuggestion({
    capacity,
    overdueCount: parts.overdue.length,
    dueTodayCount: parts.dueToday.length,
    heavyOpenCount: todayHeavyTaskCount,
    flexibleShowCount: todayFlexible.length,
    stalledPendingCount: parts.stalledPending.length,
    highPriorityOpenCount: parts.highPriorityOpen.length,
    anytimeStalledCount: anytimeStalled.length,
  });

  const notificationCandidates = buildNotificationCandidates(
    mapRows(parts.overdue),
    mapRows(parts.dueToday),
    todayFlexible,
    capacity,
  );

  const myTeamTasks = await listMyAssignedTeamTasks(userId);

  const todayProgress = computeTodayProgress(rows, todayFlexible, {
    start: parts.startToday,
    end: parts.endToday,
  });

  return {
    scopeMode: 'personal',
    overdue: mapRows(parts.overdue),
    dueToday: mapRows(parts.dueToday),
    dueSoon: mapRows(parts.dueSoon),
    inProgress: mapRows(parts.inProgress),
    stalledPending: mapRows(parts.stalledPending),
    highPriorityOpen: mapRows(parts.highPriorityOpen),
    todayFlexible,
    myTeamTasks,
    capacity,
    aiSuggestion,
    notificationCandidates,
    todayInfo: buildTodayInfo(nowInput),
    todayProgress,
  };
}

async function buildTeamDashboard(userId: string, teamId: string, nowInput: Date): Promise<DashboardPayload> {
  const team = await getTeamForUser(userId, teamId);

  const rows = await prisma.task.findMany({
    where: { teamId, scope: 'team', deletedAt: null, archivedAt: null },
    include: taskInclude,
  });

  const parts = partitionOpenTasks(rows, nowInput);
  const capacity = await getTodayCapacity(userId, nowInput);

  const myTeamTasks = (await listTeamTasks(userId, teamId, false)).filter(
    (task) => task.assigneeId === userId && !['done', 'canceled'].includes(task.status),
  );

  const todayProgress = computeTodayProgress(rows, [], {
    start: parts.startToday,
    end: parts.endToday,
  });

  const aiSuggestion =
    parts.overdue.length > 0
      ? `チーム「${team.name}」に期限切れが ${parts.overdue.length} 件あります。優先して片付けましょう。`
      : parts.dueToday.length > 0
        ? `チーム「${team.name}」で今日期限のタスクが ${parts.dueToday.length} 件あります。`
        : `チーム「${team.name}」の未完了タスクは ${parts.open.length} 件です。`;

  const notificationCandidates = buildNotificationCandidates(
    mapRows(parts.overdue),
    mapRows(parts.dueToday),
    [],
    capacity,
  );

  return {
    scopeMode: 'team',
    teamId,
    teamName: team.name,
    teamIcon: team.icon,
    overdue: mapRows(parts.overdue),
    dueToday: mapRows(parts.dueToday),
    dueSoon: mapRows(parts.dueSoon),
    inProgress: mapRows(parts.inProgress),
    stalledPending: mapRows(parts.stalledPending),
    highPriorityOpen: mapRows(parts.highPriorityOpen),
    todayFlexible: [],
    myTeamTasks,
    capacity,
    aiSuggestion,
    notificationCandidates,
    todayInfo: buildTodayInfo(nowInput),
    todayProgress,
  };
}

function buildNotificationCandidates(
  overdue: Task[],
  dueToday: Task[],
  flexible: FlexibleTaskView[],
  capacity: DashboardPayload['capacity'],
): Task[] {
  const max = capacity === 'overload' ? 3 : 5;
  const picked: Task[] = [];
  const seen = new Set<string>();

  const push = (task: Task) => {
    if (seen.has(task.id) || picked.length >= max) {
      return;
    }

    seen.add(task.id);
    picked.push(task);
  };

  for (const t of overdue) {
    push(t);
  }

  for (const t of dueToday) {
    push(t);
  }

  for (const t of flexible.filter((f) => f.flexiblePriority === 'urgent' || f.flexiblePriority === 'high')) {
    push(t);
  }

  return picked;
}
