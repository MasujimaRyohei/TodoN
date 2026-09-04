import type { SubTask, TaskWeight } from './types';

export const MAX_TASK_POINTS = 999;

export const WEIGHT_POINTS: Record<TaskWeight, number> = {
  light: 1,
  normal: 3,
  heavy: 8,
};

export function isTaskWeight(value: string): value is TaskWeight {
  return value === 'light' || value === 'normal' || value === 'heavy';
}

/** 工数の重さからポイント初期値を算出 */
export function pointsFromWeight(weight: string): number {
  return isTaskWeight(weight) ? WEIGHT_POINTS[weight] : WEIGHT_POINTS.normal;
}

export function resolveTaskPoints(weight: string, points?: number | null): number {
  if (typeof points === 'number' && Number.isFinite(points)) {
    return Math.max(0, Math.min(MAX_TASK_POINTS, Math.round(points)));
  }

  return pointsFromWeight(weight);
}

/** 親タスクの持ち点に対する、サブタスクへの割当状況。 */
export type SubtaskBudget = {
  /** 親タスクが持つ総ポイント */
  total: number;
  /** 既にサブタスクへ割り当て済みのポイント合計 */
  allocated: number;
  /** まだ割り当て可能なポイント */
  remaining: number;
};

export function subtaskBudget(
  taskPoints: number,
  subtasks: Pick<SubTask, 'id' | 'points'>[],
  excludeSubtaskId?: string,
): SubtaskBudget {
  const allocated = subtasks
    .filter((sub) => sub.id !== excludeSubtaskId)
    .reduce((sum, sub) => sum + (sub.points ?? 0), 0);

  return {
    total: taskPoints,
    allocated,
    remaining: Math.max(0, taskPoints - allocated),
  };
}

/** サブタスクへ `points` を割り当てても予算内に収まるか。 */
export function fitsSubtaskBudget(
  taskPoints: number,
  subtasks: Pick<SubTask, 'id' | 'points'>[],
  points: number,
  excludeSubtaskId?: string,
): boolean {
  const { allocated } = subtaskBudget(taskPoints, subtasks, excludeSubtaskId);
  return allocated + points <= taskPoints;
}
