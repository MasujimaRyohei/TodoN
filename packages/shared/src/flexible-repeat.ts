import type { CapacityLevel } from './capacity';
import type { PriorityLevel, TaskWeight } from './types';

export type FlexibleRepeatDecision = {
  show: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
};

export type FlexibleRepeatInput = {
  lastCompletedAt: Date | null;
  flexibleMinDays: number;
  flexibleMaxDays: number;
  importance: PriorityLevel;
  urgency: PriorityLevel;
  weight: TaskWeight;
  skipCount: number;
};

export type FlexibleRepeatContext = {
  now: Date;
  todayOpenTaskCount: number;
  todayHeavyTaskCount: number;
  capacity: CapacityLevel;
};

export function daysSinceCompletion(lastCompletedAt: Date | null, now: Date) {
  if (!lastCompletedAt) {
    return Number.POSITIVE_INFINITY;
  }

  const ms = now.getTime() - lastCompletedAt.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * だいたいリピートの表示判定（v1.5 ルールベース）
 * @see 仕様 7.4
 */
export function evaluateFlexibleRepeat(
  input: FlexibleRepeatInput,
  context: FlexibleRepeatContext,
): FlexibleRepeatDecision {
  const { flexibleMinDays, flexibleMaxDays } = input;

  if (flexibleMinDays < 1 || flexibleMaxDays < flexibleMinDays) {
    return { show: false, priority: 'low', reason: 'リピート設定が不正です' };
  }

  const days = daysSinceCompletion(input.lastCompletedAt, context.now);

  if (days < flexibleMinDays) {
    return { show: false, priority: 'low', reason: '最短間隔に達していません' };
  }

  const pastMax = days >= flexibleMaxDays;
  const nearMax = days >= flexibleMaxDays - 1;

  if (pastMax) {
    return { show: true, priority: 'urgent', reason: '最長間隔を超えています。優先して表示します' };
  }

  if (nearMax) {
    if (context.capacity === 'overload') {
      return { show: true, priority: 'high', reason: '最長間隔に近づいています（厳選表示）' };
    }

    return { show: true, priority: 'high', reason: '最長間隔に近づいています' };
  }

  const manyTasksToday = context.todayOpenTaskCount >= 8;
  const busyDay = context.capacity === 'busy' || context.capacity === 'overload';

  if (busyDay && manyTasksToday && input.weight === 'light' && input.importance !== 'high') {
    return {
      show: false,
      priority: 'low',
      reason: '今日のタスクが多いため、軽いリピートは明日に回せます',
    };
  }

  if (context.capacity === 'overload' && input.importance !== 'high' && input.urgency !== 'high') {
    return {
      show: false,
      priority: 'low',
      reason: '今日は無理モードのため、最低限のタスクのみ表示しています',
    };
  }

  if (input.skipCount >= 2 && !nearMax && !pastMax) {
    return {
      show: true,
      priority: 'medium',
      reason: '2回スキップされています。できれば今週前半に片付けましょう',
    };
  }

  return { show: true, priority: 'medium', reason: 'だいたいの周期で今日の候補です' };
}
