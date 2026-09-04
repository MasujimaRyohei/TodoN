/**
 * タイトルからサブタスク案を生成（v3 ルールベース）
 */
const TEMPLATES: { match: RegExp; steps: string[] }[] = [
  {
    match: /イベント|勉強会|meetup/i,
    steps: [
      '目的と日程を決める',
      '会場・ツールを押さえる',
      '告知文を書く',
      '参加者に連絡',
      '当日の進行を作る',
    ],
  },
  {
    match: /記事|執筆|ブログ/i,
    steps: ['構成をメモする', '下書きを書く', '見直して直す', '公開・共有する'],
  },
  {
    match: /旅行|出張|trip/i,
    steps: ['日程を決める', '交通と宿を予約', '持ち物リスト', '予定をカレンダーに入れる'],
  },
  {
    match: /引っ越|引越|move/i,
    steps: ['段ボールを用意', '荷造り', '住所変更', '退去・入居手続き'],
  },
  {
    match: /請求|invoice|支払/i,
    steps: ['金額を確認', '書類を準備', '送付または申請', '記録を残す'],
  },
  {
    match: /開発|実装|feature/i,
    steps: ['要件を整理', '設計メモ', '実装', '動作確認', 'レビュー依頼'],
  },
];

const DEFAULT_STEPS = ['最初の一歩を決める', '必要な情報を集める', '実行する', '完了を確認する'];

export function suggestSubtasks(title: string, max = 6): string[] {
  const trimmed = title.trim();
  if (!trimmed) {
    return [];
  }

  for (const tpl of TEMPLATES) {
    if (tpl.match.test(trimmed)) {
      return tpl.steps.slice(0, max);
    }
  }

  if (trimmed.length > 30) {
    return ['背景を整理', 'ゴールを一文で書く', ...DEFAULT_STEPS.slice(1)].slice(0, max);
  }

  return DEFAULT_STEPS.slice(0, max);
}
