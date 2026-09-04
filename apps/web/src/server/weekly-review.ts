import type { WeeklyReview as PrismaWeeklyReview } from '@prisma/client';
import type { WeeklyReview as WeeklyReviewDto } from '@todon/shared';

import { endOfUtcWeek, startOfUtcWeek } from '@/lib/date';
import { prisma } from '@/lib/prisma';

import { listUserTeamIds, requireMembership } from './team-access';

function mapReview(row: PrismaWeeklyReview): WeeklyReviewDto {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as 'personal' | 'team',
    weekStart: row.weekStart.toISOString(),
    weekEnd: row.weekEnd.toISOString(),
    summary: row.summary,
    insights: JSON.parse(row.insightsJson) as string[],
    recommendations: JSON.parse(row.recommendationsJson) as string[],
    rawStats: JSON.parse(row.rawStatsJson) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

type WeekStats = {
  completed: number;
  open: number;
  pending: number;
  canceled: number;
  overdue: number;
  highImportanceOpen: number;
  heavyOpen: number;
  flexibleCompleted: number;
  flexibleSkipped: number;
  anytimeOpen: number;
  byCategory: Record<string, number>;
};

async function collectWeekStats(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<WeekStats> {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      scope: 'personal',
      deletedAt: null,
      createdAt: { lt: weekEnd },
    },
    include: { category: true },
  });

  const now = new Date();

  const stats: WeekStats = {
    completed: 0,
    open: 0,
    pending: 0,
    canceled: 0,
    overdue: 0,
    highImportanceOpen: 0,
    heavyOpen: 0,
    flexibleCompleted: 0,
    flexibleSkipped: 0,
    anytimeOpen: 0,
    byCategory: {},
  };

  for (const t of tasks) {
    const cat = t.category?.name ?? '未分類';
    stats.byCategory[cat] = (stats.byCategory[cat] ?? 0) + 1;

    if (t.status === 'done' && t.updatedAt >= weekStart && t.updatedAt < weekEnd) {
      stats.completed += 1;
      if (t.repeatType === 'flexible') {
        stats.flexibleCompleted += 1;
      }
    }

    if (['todo', 'doing'].includes(t.status)) {
      stats.open += 1;
      if (t.importance === 'high') {
        stats.highImportanceOpen += 1;
      }
      if (t.weight === 'heavy') {
        stats.heavyOpen += 1;
      }
      if (t.dueType === 'anytime') {
        stats.anytimeOpen += 1;
      }
      if (t.dueType === 'datetime' && t.dueAt && t.dueAt < now) {
        stats.overdue += 1;
      }
    }

    if (t.status === 'pending') {
      stats.pending += 1;
    }

    if (t.status === 'canceled') {
      stats.canceled += 1;
    }

    if (t.repeatType === 'flexible' && t.flexibleSkipCount > 0) {
      stats.flexibleSkipped += t.flexibleSkipCount;
    }
  }

  return stats;
}

function buildReviewText(stats: WeekStats, prev?: WeekStats) {
  const insights: string[] = [];
  const recommendations: string[] = [];

  const completedDelta = prev != null ? stats.completed - prev.completed : null;

  if (completedDelta != null && completedDelta > 0) {
    insights.push(`完了タスク数は先週より ${completedDelta} 件増えています。`);
  } else if (completedDelta != null && completedDelta < 0) {
    insights.push(`完了タスク数は先週より ${Math.abs(completedDelta)} 件減っています。`);
  }

  if (stats.highImportanceOpen > 0) {
    insights.push(`重要度が高い未完了タスクが ${stats.highImportanceOpen} 件残っています。`);
    recommendations.push(
      '来週は週の前半に、重要度が高いタスクを1つだけ進める時間を確保しましょう。',
    );
  }

  if (stats.flexibleSkipped >= 2) {
    insights.push(
      `だいたいリピートのタスクが合計 ${stats.flexibleSkipped} 回スキップされています。`,
    );
    recommendations.push('週の前半に、軽い片付けタスクを15分だけ入れてみましょう。');
  }

  if (stats.pending >= 3) {
    insights.push(`保留タスクが ${stats.pending} 件あります。`);
    recommendations.push(
      '保留の理由をメモし、次のアクションを1行だけ書き足すと進みやすくなります。',
    );
  }

  if (stats.anytimeOpen >= 5) {
    insights.push(`いつでもタスクが ${stats.anytimeOpen} 件残っています。`);
    recommendations.push('来週はいつでもタスクを3件だけ処理する日を1日作るのがおすすめです。');
  }

  const topCategory = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    insights.push(
      `もっともタスクが多いカテゴリは「${topCategory[0]}」です（${topCategory[1]} 件）。`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      '今週のペースを維持しつつ、重いタスクは午前中に1つだけ配置してみましょう。',
    );
  }

  const summary =
    completedDelta != null && completedDelta > 0
      ? `今週は ${stats.completed} 件のタスクを完了しました。先週より進捗が出ています。`
      : `今週は ${stats.completed} 件のタスクを完了しました。未完了は ${stats.open} 件です。`;

  return { summary, insights, recommendations };
}

async function collectTeamWeekStats(
  teamId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<WeekStats & { unassigned: number }> {
  const tasks = await prisma.task.findMany({
    where: {
      teamId,
      scope: 'team',
      deletedAt: null,
      createdAt: { lt: weekEnd },
    },
  });

  const stats: WeekStats & { unassigned: number } = {
    completed: 0,
    open: 0,
    pending: 0,
    canceled: 0,
    overdue: 0,
    highImportanceOpen: 0,
    heavyOpen: 0,
    flexibleCompleted: 0,
    flexibleSkipped: 0,
    anytimeOpen: 0,
    byCategory: {},
    unassigned: 0,
  };

  const now = new Date();

  for (const t of tasks) {
    const cat = t.categoryId ?? '未分類';
    stats.byCategory[cat] = (stats.byCategory[cat] ?? 0) + 1;

    if (!t.assigneeId && ['todo', 'doing', 'pending'].includes(t.status)) {
      stats.unassigned += 1;
    }

    if (t.status === 'done' && t.updatedAt >= weekStart && t.updatedAt < weekEnd) {
      stats.completed += 1;
    }

    if (['todo', 'doing'].includes(t.status)) {
      stats.open += 1;
    }

    if (t.status === 'pending') {
      stats.pending += 1;
    }

    if (t.dueType === 'datetime' && t.dueAt && t.dueAt < now && t.status !== 'done') {
      stats.overdue += 1;
    }
  }

  return stats;
}

export async function listWeeklyReviews(userId: string, limit = 12) {
  const teamIds = await listUserTeamIds(userId);

  const rows = await prisma.weeklyReview.findMany({
    where: {
      OR: [{ userId }, ...(teamIds.length ? [{ teamId: { in: teamIds } }] : [])],
    },
    orderBy: { weekStart: 'desc' },
    take: limit,
  });

  return rows.map(mapReview);
}

export async function generateWeeklyReview(userId: string, now = new Date()) {
  const weekStart = startOfUtcWeek(now);
  const weekEnd = endOfUtcWeek(weekStart);

  const existing = await prisma.weeklyReview.findFirst({
    where: {
      userId,
      weekStart,
    },
  });

  if (existing) {
    return mapReview(existing);
  }

  const stats = await collectWeekStats(userId, weekStart, weekEnd);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
  const prevWeekEnd = new Date(weekStart);
  const prevStats = await collectWeekStats(userId, prevWeekStart, prevWeekEnd);

  const { summary, insights, recommendations } = buildReviewText(stats, prevStats);

  const row = await prisma.weeklyReview.create({
    data: {
      userId,
      type: 'personal',
      weekStart,
      weekEnd,
      summary,
      insightsJson: JSON.stringify(insights),
      recommendationsJson: JSON.stringify(recommendations),
      rawStatsJson: JSON.stringify({ current: stats, previous: prevStats }),
    },
  });

  return mapReview(row);
}

export async function generateTeamWeeklyReview(userId: string, teamId: string, now = new Date()) {
  await requireMembership(userId, teamId);

  const weekStart = startOfUtcWeek(now);
  const weekEnd = endOfUtcWeek(weekStart);

  const existing = await prisma.weeklyReview.findFirst({
    where: { teamId, weekStart, type: 'team' },
  });

  if (existing) {
    return mapReview(existing);
  }

  const stats = await collectTeamWeekStats(teamId, weekStart, weekEnd);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
  const prevWeekEnd = new Date(weekStart);
  const prevStats = await collectTeamWeekStats(teamId, prevWeekStart, prevWeekEnd);

  const insights: string[] = [];
  const recommendations: string[] = [];

  const completedDelta = stats.completed - prevStats.completed;

  if (completedDelta > 0) {
    insights.push(`チームの完了数は先週より ${completedDelta} 件増えています。`);
  }

  if (stats.unassigned > 0) {
    insights.push(`担当者未設定のタスクが ${stats.unassigned} 件あります。`);
    recommendations.push(
      '新規タスク作成時に担当者を必ず割り当てる習慣をつけると進行が速くなります。',
    );
  }

  if (stats.pending >= 3) {
    insights.push(`保留中のチームタスクが ${stats.pending} 件あります。`);
    recommendations.push('保留の理由をコメントに残し、次の一手を明確にしましょう。');
  }

  if (stats.overdue > 0) {
    insights.push(`期限切れのチームタスクが ${stats.overdue} 件あります。`);
    recommendations.push('期限切れタスクを1件ずつ見直し、担当者と期限を再調整してください。');
  }

  if (recommendations.length === 0) {
    recommendations.push('来週はチーム全体の未完了を朝会で5分だけ共有すると認識が揃います。');
  }

  const summary = `今週チームで ${stats.completed} 件のタスクが完了しました。未完了は ${stats.open} 件、担当者未設定は ${stats.unassigned} 件です。`;

  const row = await prisma.weeklyReview.create({
    data: {
      teamId,
      type: 'team',
      weekStart,
      weekEnd,
      summary,
      insightsJson: JSON.stringify(insights),
      recommendationsJson: JSON.stringify(recommendations),
      rawStatsJson: JSON.stringify({ current: stats, previous: prevStats }),
    },
  });

  return mapReview(row);
}
