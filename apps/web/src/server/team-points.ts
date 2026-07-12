import type { TeamMemberPointsSummary, TeamPointsPayload } from '@todon/shared';

import { endOfLocalDay, startOfLocalDay } from '@/lib/date';
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

export async function getTeamMemberPoints(userId: string, teamId: string): Promise<TeamPointsPayload> {
  await requireMembership(userId, teamId);

  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  const weekStart = startOfLocalWeek(now);
  const monthStart = startOfLocalMonth(now);

  const [members, completions] = await Promise.all([
    listTeamMembers(userId, teamId),
    prisma.taskActivityLog.findMany({
      where: {
        action: 'status_changed',
        after: 'done',
        task: {
          teamId,
          scope: 'team',
          deletedAt: null,
        },
      },
      select: {
        userId: true,
        createdAt: true,
        task: { select: { points: true } },
      },
    }),
  ]);

  const buckets = new Map<string, Bucket>();

  for (const member of members) {
    buckets.set(member.userId, emptyBucket());
  }

  for (const row of completions) {
    const bucket = buckets.get(row.userId) ?? emptyBucket();
    const points = row.points ?? row.task.points;
    const at = row.createdAt;

    bucket.allTime += points;

    if (at >= monthStart) {
      bucket.month += points;
    }

    if (at >= weekStart) {
      bucket.week += points;
    }

    if (at >= todayStart && at < todayEnd) {
      bucket.today += points;
    }

    buckets.set(row.userId, bucket);
  }

  const memberSummaries: TeamMemberPointsSummary[] = members.map((member) => {
    const bucket = buckets.get(member.userId) ?? emptyBucket();

    return {
      userId: member.userId,
      name: member.user?.name ?? null,
      email: member.user?.email ?? member.userId,
      ...bucket,
    };
  });

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
