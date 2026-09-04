import type { TeamMemberPointsSummary, TeamPointsPayload } from '@todon/shared';

import { startOfLocalDay } from '@/lib/date';
import { prisma } from '@/lib/prisma';

import { listTeamMembers } from './teams';
import { requireMembership } from './team-access';

function startOfLocalWeek(date: Date) {
  const d = startOfLocalDay(date);
  const weekday = d.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

function startOfLocalMonth(date: Date) {
  const d = startOfLocalDay(date);
  d.setDate(1);
  return d;
}

type Bucket = {
  allTime: number;
  month: number;
  week: number;
  today: number;
};

function emptyBucket(): Bucket {
  return { allTime: 0, month: 0, week: 0, today: 0 };
}

type Earning = { userId: string; points: number; at: Date };

function addEarning(buckets: Map<string, Bucket>, earning: Earning, marks: Marks) {
  if (earning.points <= 0) {
    return;
  }

  const bucket = buckets.get(earning.userId);
  if (!bucket) {
    return;
  }

  bucket.allTime += earning.points;
  if (earning.at >= marks.month) {
    bucket.month += earning.points;
  }
  if (earning.at >= marks.week) {
    bucket.week += earning.points;
  }
  if (earning.at >= marks.today) {
    bucket.today += earning.points;
  }
}

type Marks = { today: Date; week: Date; month: Date };

/**
 * ポイントは主にサブタスク完了で獲得する。サブタスクを持たないメインタスクを
 * 完了した場合のみ、そのタスクの持ち点を完了者へ加算する（個人利用の互換のため）。
 */
export async function getTeamMemberPoints(
  userId: string,
  teamId: string,
): Promise<TeamPointsPayload> {
  await requireMembership(userId, teamId);

  const now = new Date();
  const marks: Marks = {
    today: startOfLocalDay(now),
    week: startOfLocalWeek(now),
    month: startOfLocalMonth(now),
  };

  const [members, doneSubtasks, soloTaskCompletions] = await Promise.all([
    listTeamMembers(userId, teamId),
    prisma.subTask.findMany({
      where: {
        completed: true,
        completedById: { not: null },
        completedAt: { not: null },
        task: { teamId, scope: 'team', deletedAt: null },
      },
      select: { completedById: true, completedAt: true, points: true },
    }),
    prisma.taskActivityLog.findMany({
      where: {
        action: 'status_changed',
        after: 'done',
        task: { teamId, scope: 'team', deletedAt: null, subtasks: { none: {} } },
      },
      select: { userId: true, createdAt: true, task: { select: { points: true } } },
    }),
  ]);

  const buckets = new Map<string, Bucket>();
  for (const member of members) {
    buckets.set(member.userId, emptyBucket());
  }

  for (const sub of doneSubtasks) {
    if (!sub.completedById || !sub.completedAt) {
      continue;
    }
    addEarning(
      buckets,
      { userId: sub.completedById, points: sub.points, at: sub.completedAt },
      marks,
    );
  }

  for (const log of soloTaskCompletions) {
    addEarning(buckets, { userId: log.userId, points: log.task.points, at: log.createdAt }, marks);
  }

  const memberSummaries: TeamMemberPointsSummary[] = members.map((member) => ({
    userId: member.userId,
    name: member.user?.name ?? null,
    email: member.user?.email ?? member.userId,
    ...(buckets.get(member.userId) ?? emptyBucket()),
  }));

  memberSummaries.sort((a, b) => b.month - a.month || b.allTime - a.allTime);

  const teamTotal = memberSummaries.reduce(
    (acc, member) => ({
      allTime: acc.allTime + member.allTime,
      month: acc.month + member.month,
      week: acc.week + member.week,
      today: acc.today + member.today,
    }),
    emptyBucket(),
  );

  return { members: memberSummaries, teamTotal };
}
