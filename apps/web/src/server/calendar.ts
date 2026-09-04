import type { CalendarDay, GanttItem } from '@todon/shared';

import { mapTask } from '@/lib/mappers';
import { prisma } from '@/lib/prisma';

import { taskInclude } from './task-queries';

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getCalendarRange(userId: string, start: Date, end: Date) {
  const rows = await prisma.task.findMany({
    where: {
      userId,
      deletedAt: null,
      archivedAt: null,
      OR: [{ dueAt: { gte: start, lte: end } }, { startAt: { gte: start, lte: end } }],
    },
    include: taskInclude,
    orderBy: { dueAt: 'asc' },
  });

  const byDay = new Map<string, ReturnType<typeof mapTask>[]>();

  for (const row of rows) {
    const anchor = row.dueAt ?? row.startAt ?? row.createdAt;
    const key = dayKey(anchor);
    const list = byDay.get(key) ?? [];
    list.push(mapTask(row));
    byDay.set(key, list);
  }

  const days: CalendarDay[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = dayKey(cursor);
    days.push({ date: key, tasks: byDay.get(key) ?? [] });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export async function getGanttItems(userId: string, start: Date, end: Date): Promise<GanttItem[]> {
  const rows = await prisma.task.findMany({
    where: {
      userId,
      deletedAt: null,
      archivedAt: null,
      OR: [
        { dueAt: { gte: start, lte: end } },
        { startAt: { gte: start, lte: end } },
        { createdAt: { gte: start, lte: end } },
      ],
    },
    include: { project: { select: { name: true } } },
    orderBy: { startAt: 'asc' },
  });

  return rows.map((row) => {
    const startAt = row.startAt ?? row.createdAt;
    const endAt = row.dueAt ?? new Date(startAt.getTime() + 24 * 60 * 60 * 1000);

    return {
      id: row.id,
      title: row.title,
      start: startAt.toISOString(),
      end: endAt.toISOString(),
      status: row.status as GanttItem['status'],
      projectName: row.project?.name ?? null,
    };
  });
}

export function buildIcsFeed(
  userEmail: string,
  tasks: { title: string; dueAt: Date | null; description: string | null }[],
) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TodoN//JP', 'CALSCALE:GREGORIAN'];

  for (const task of tasks) {
    if (!task.dueAt) {
      continue;
    }

    const stamp = task.dueAt
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z/, 'Z');
    const uid = `${stamp}-${task.title.slice(0, 8)}@todon`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${stamp}`);
    lines.push(`SUMMARY:${task.title.replace(/\n/g, ' ')}`);
    if (task.description) {
      lines.push(`DESCRIPTION:${task.description.replace(/\n/g, ' ').slice(0, 200)}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export async function getIcsForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      deletedAt: null,
      archivedAt: null,
      dueAt: { not: null },
    },
    select: { title: true, dueAt: true, description: true },
    take: 200,
    orderBy: { dueAt: 'asc' },
  });

  return buildIcsFeed(user?.email ?? 'user@todon.local', tasks);
}
