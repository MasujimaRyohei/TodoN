import type { TaskWeight } from './types';

const HEAVY_KEYWORDS = [
  '仕様',
  '設計',
  '開発',
  '実装',
  '記事',
  '執筆',
  'イベント',
  '企画',
  '整理',
  '片付け',
];
const LIGHT_KEYWORDS = ['メール', '返信', '確認', '連絡', '電話', '水やり', '買い物', 'メモ'];

/**
 * タイトルからタスクの重さを推定（v1.5 ルールベース。将来 AI に差し替え可能）
 */
export function estimateTaskWeight(title: string): TaskWeight {
  const normalized = title.trim().toLowerCase();

  if (!normalized) {
    return 'normal';
  }

  if (LIGHT_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return 'light';
  }

  if (HEAVY_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return 'heavy';
  }

  if (normalized.length > 40) {
    return 'heavy';
  }

  return 'normal';
}
