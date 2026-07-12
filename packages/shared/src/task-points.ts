import type { TaskWeight } from './types';

export const WEIGHT_POINTS: Record<TaskWeight, number> = {
  light: 1,
  normal: 3,
  heavy: 8,
};

/** 工数の重さからポイント初期値を算出 */
export function pointsFromWeight(weight: TaskWeight): number {
  return WEIGHT_POINTS[weight];
}

export function resolveTaskPoints(weight: TaskWeight, points?: number | null): number {
  if (typeof points === 'number' && Number.isFinite(points)) {
    return Math.max(0, Math.min(999, Math.round(points)));
  }

  return pointsFromWeight(weight);
}
